# D1 Delta Projections Implementation Plan

This document describes the planned implementation for delta-table projections in `packages/d1`.

The goal is to keep writes simple and append-only in delta tables, while allowing Cloudflare Workers to maintain optimized derived tables such as:

- read-model tables,
- linking tables,
- search/index tables,
- change-history tables,
- other materialized views derived from deltas.

The design is intentionally split into two low-level primitives plus convenience wrappers:

- primitive: `defineDeltaProjection(...)`
- primitive: `defineStaleDeltaPolicy(...)`
- wrapper: `defineReadModelProjection(...)`
- wrapper: `defineChangeHistoryProjection(...)`
- wrapper: `defineRetentionPolicy(...)`
- wrapper: `blockStaleCleanupUsingProjection(...)`
- runtime: `runDeltaProjections(...)`
- runtime: `runStaleDeltaCleanup(...)`

## Design principles

1. **Projection declarations live next to model schemas.**
   They should be readable in files such as `apps/theme-builder/src/models/ThemeDefinition.ts`.

2. **Projection declarations are metadata only.**
   Calling `defineDeltaProjection(...)` at module load may register metadata, but must not query D1, mutate D1, start timers, or run projection work.

3. **Workers use generated manifests.**
   `generateSchema` should scan model modules, discover registered projections/policies, and generate a static TypeScript manifest that Cloudflare Workers can import.

4. **Stale cleanup is separate from projection declaration.**
   `defineDeltaProjection(...)` should not have `blocksStaleCleanup`, `retainFor`, or similar options.

5. **Stale policies are guards.**
   Cleanup should delete a delta only when:

   ```txt
   1. the base stale algorithm says the delta is stale,
   2. every registered stale guard for that source table allows deletion.
   ```

6. **Convenience wrappers compose primitives.**
   `defineReadModelProjection(...)`, `defineChangeHistoryProjection(...)`, `defineRetentionPolicy(...)`, and `blockStaleCleanupUsingProjection(...)` should all be implemented in terms of `defineDeltaProjection(...)` and/or `defineStaleDeltaPolicy(...)`.

7. **Projection writes must be idempotent.**
   Workers can crash or retry after writing target rows but before marking source deltas as acked. Projection code must tolerate repeated processing.

8. **Add `event_id` to persisted delta rows.**
   Projection acking, change history, and idempotency all become safer with a stable event id. `ModelDelta` should gain an optional `eventId?: string` so frontend code can ignore it when convenient; D1 persistence should generate one when absent.

9. **No production migration constraints yet.**
   Nothing has gone to production, so existing local/dev data can be deleted if needed. We do not need a complex backwards-compatible migration path for old delta rows.

10. **One schema represents one delta table.**
    The implementation can assume model schemas are a one-to-one representation of delta tables. Cleanup/projection grouping can therefore be per schema/source table without supporting multiple schemas pointing to the same source table as a special case.

---

## Base model schema example

```ts
import { z } from "zod"
import { modelSchema } from "@web/schema"
import {
    createModelSchema,
    defineDeltaProjection,
    defineStaleDeltaPolicy,
    defineReadModelProjection,
    defineChangeHistoryProjection,
    defineRetentionPolicy,
} from "@web/d1"

export const themeDefinitionSchema = z.object({
    ...modelSchema,
    name: z.string().trim().nonempty(),
    class: z.string().trim().nonempty(),
    description: z.string().optional(),
    mode: z.enum(["light", "dark"]).default("light"),
}).meta({
    table: createModelSchema("theme_events", { recreate: true }).build(),
})
```

Every projection/policy primitive should receive the Zod schema. Internally it can read schema metadata to find the source delta table:

```ts
const metadata = schema.meta()
const table = metadata.table
const sourceTable = table.tableName
```

---

# Primitive 1: `defineDeltaProjection(...)`

`defineDeltaProjection(...)` describes how to turn source deltas into a derived target table.

It should:

- receive the source Zod schema,
- read the schema metadata/table metadata,
- register projection metadata for `generateSchema`,
- define a source ack column name,
- define the projection target table SQL,
- define runtime projection behavior.

It should not:

- run projection work at declaration time,
- define stale cleanup behavior,
- require manual worker registration.

## Model-mode projection example

Model-mode projections rebuild the current model using `createModel(...)` from `@web/solid-delta`, then call `project(...)` once per affected model id.

```ts
export const customThemeProjection = defineDeltaProjection(themeDefinitionSchema, {
    name: "custom_theme_projection",
    version: 1,
    mode: "model",

    target: createProjectionTable("custom_theme_projection_table")
        .addColumn("id", "TEXT", { primaryKey: true })
        .addColumn("name", "TEXT", { notNull: true })
        .build(),

    async project({ db, id, model }) {
        if (!model) {
            await db.prepare(`
                DELETE FROM custom_theme_projection_table
                WHERE id = ?
            `).bind(id).run()

            return
        }

        await db.prepare(`
            INSERT INTO custom_theme_projection_table (id, name)
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name
        `).bind(model.id, model.name).run()
    },
})
```

## Delta-mode projection example

Delta-mode projections process each new persisted delta directly. This is useful for append-only change history or audit tables.

```ts
export const rawThemeHistoryProjection = defineDeltaProjection(themeDefinitionSchema, {
    name: "raw_theme_history",
    version: 1,
    mode: "delta",

    target: createProjectionTable("raw_theme_history")
        .addColumn("event_id", "TEXT", { primaryKey: true })
        .addColumn("model_id", "TEXT", { notNull: true })
        .addColumn("path", "TEXT", { notNull: true })
        .addColumn("value", "TEXT")
        .addColumn("timestamp", "INTEGER", { notNull: true })
        .build(),

    async projectDelta({ db, delta }) {
        await db.prepare(`
            INSERT OR IGNORE INTO raw_theme_history (
                event_id,
                model_id,
                path,
                value,
                timestamp
            )
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            delta.eventId,
            delta.id,
            delta.path,
            serializeDeltaValue(delta.value),
            delta.timestamp,
        ).run()
    },
})
```

## Ack column

Every projection gets an ack column on the source delta table:

```ts
`${projection.name}_v${projection.version}_acked_at`
```

Example:

```sql
ALTER TABLE "theme_events"
ADD COLUMN "custom_theme_projection_v1_acked_at" INTEGER;
```

The projection runner uses this column to find pending rows:

```sql
SELECT event_id, id, path, value, timestamp
FROM "theme_events"
WHERE "custom_theme_projection_v1_acked_at" IS NULL
ORDER BY timestamp
LIMIT ?;
```

---

# Primitive 2: `defineStaleDeltaPolicy(...)`

`defineStaleDeltaPolicy(...)` defines a cleanup guard. It does not decide what is base-stale by itself. It only narrows the rows that the base stale algorithm is allowed to delete.

Cleanup rule:

```txt
A delta can be deleted only if:
1. it is stale according to the base stale algorithm,
2. every stale guard allows deletion.
```

A stale policy can provide:

- `where(...)`: SQL condition used while selecting cleanup candidates,
- `filter(...)`: JavaScript predicate used after candidate rows are loaded.

Both are optional, but a policy should define at least one.

## SQL guard example

```ts
export const themeCustomCleanupGuard = defineStaleDeltaPolicy(themeDefinitionSchema, {
    name: "theme_custom_cleanup_guard",

    where({ sourceAlias }) {
        return {
            sql: `${sourceAlias}.path != ?`,
            bind: ["do_not_delete_this_path"],
        }
    },
})
```

## JavaScript guard example

```ts
export const themeCustomJsCleanupGuard = defineStaleDeltaPolicy(themeDefinitionSchema, {
    name: "theme_custom_js_cleanup_guard",

    async filter({ delta }) {
        return delta.path !== "do_not_delete_this_path"
    },
})
```

## SQL + JavaScript guard example

```ts
export const themeImportantDeltaGuard = defineStaleDeltaPolicy(themeDefinitionSchema, {
    name: "theme_important_delta_guard",

    where({ sourceAlias }) {
        return {
            sql: `${sourceAlias}.path != ?`,
            bind: ["important"],
        }
    },

    filter({ delta }) {
        return !String(delta.value).includes("keep")
    },
})
```

`where` should be preferred when possible because SQLite/D1 can filter rows before they are loaded into JavaScript.

---

# Convenience wrapper: `defineReadModelProjection(...)`

`defineReadModelProjection(...)` is the common read-table wrapper. It should be as simple to use as `defineChangeHistoryProjection(...)`.

The minimal usage should be:

```ts
export const themeReadProjection = defineReadModelProjection(themeDefinitionSchema, {
    name: "theme_read",
    version: 1,
})
```

This should:

1. infer a target table name, unless explicitly overridden,
2. infer SQL columns from the Zod schema,
3. use `createModel(...)` on source deltas,
4. insert/update the current model into the projection table,
5. delete the read-model row when the projected model is deleted,
6. ack source deltas after the projection write succeeds.

## Default table naming

If `tableName` is omitted, derive one from the projection name:

```ts
`${name}_models`
```

Example:

```ts
name: "theme_read"
```

creates:

```sql
theme_read_models
```

## Column inference

`defineReadModelProjection(...)` should infer projection columns from the Zod object shape.

Suggested initial mapping:

| Zod type | SQL type |
| --- | --- |
| `z.string()` | `TEXT` |
| `z.number()` | `REAL` |
| integer-like number metadata/future helper | `INTEGER` |
| `z.boolean()` | `INTEGER` |
| `z.enum(...)` | `TEXT` |
| `z.literal(...)` | inferred from literal |
| optional/nullable fields | nullable column |
| arrays/objects | `TEXT` containing JSON |

Special model fields:

| Model field | Projection column |
| --- | --- |
| `id` | `id TEXT PRIMARY KEY` |
| `updatedAt` | `updated_at INTEGER` |

For `ThemeDefinition`, the inferred read table would be approximately:

```sql
CREATE TABLE IF NOT EXISTS "theme_read_models" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "class" TEXT NOT NULL,
  "description" TEXT,
  "mode" TEXT NOT NULL,
  "updated_at" INTEGER
);
```

Default upsert:

```sql
INSERT INTO "theme_read_models" (...)
VALUES (...)
ON CONFLICT("id") DO UPDATE SET
  "name" = excluded."name",
  "class" = excluded."class",
  "description" = excluded."description",
  "mode" = excluded."mode",
  "updated_at" = excluded."updated_at";
```

Default delete:

```sql
DELETE FROM "theme_read_models"
WHERE "id" = ?;
```

## Read-model overrides

The simple case should require only `name` and `version`, but overrides should be possible:

```ts
export const themeReadProjection = defineReadModelProjection(themeDefinitionSchema, {
    name: "theme_read",
    version: 1,
    tableName: "theme_read_models",

    indexes: [
        ["mode"],
        ["class"],
    ],

    renameColumns: {
        updatedAt: "updated_at",
    },

    exclude: ["largeJsonBlob"],

    columns: {
        // optional explicit override if inference is wrong
        mode: { type: "TEXT", notNull: true },
    },

    mapModel(model) {
        // optional final row mapping hook
        return {
            ...model,
            updated_at: model.updatedAt,
        }
    },
})
```

Internally, this wrapper should expand to a `mode: "model"` `defineDeltaProjection(...)`.

---

# Convenience wrapper: `defineChangeHistoryProjection(...)`

The minimal usage should be:

```ts
export const themeChangeHistoryProjection = defineChangeHistoryProjection(themeDefinitionSchema, {
    name: "theme_change_history",
    version: 1,
})
```

This should automatically create:

1. a delta-mode projection,
2. a change-history target table,
3. an idempotent `INSERT OR IGNORE` projection write keyed by `event_id`,
4. a generated stale policy requiring this projection to ack a source delta before cleanup may delete that delta.

Default target table:

```sql
CREATE TABLE IF NOT EXISTS "theme_change_history" (
  "event_id" TEXT PRIMARY KEY,
  "model_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "value" TEXT,
  "timestamp" INTEGER NOT NULL,
  "change_type" TEXT NOT NULL
);
```

Default indexes:

```sql
CREATE INDEX IF NOT EXISTS "theme_change_history_model_id_timestamp_idx"
ON "theme_change_history" ("model_id", "timestamp");

CREATE INDEX IF NOT EXISTS "theme_change_history_path_timestamp_idx"
ON "theme_change_history" ("path", "timestamp");
```

Possible overrides:

```ts
export const themeChangeHistoryProjection = defineChangeHistoryProjection(themeDefinitionSchema, {
    name: "theme_change_history",
    version: 1,
    tableName: "theme_history",
    modelIdColumn: "theme_id",
    includeSnapshotFields: ["name", "class", "mode"],
    extraColumns: {
        actor_id: {
            type: "TEXT",
            value({ delta }) {
                return delta.actorId ?? null
            },
        },
    },
})
```

---

# Convenience wrapper: `defineRetentionPolicy(...)`

`defineRetentionPolicy(...)` should wrap `defineStaleDeltaPolicy(...)`.

```ts
export const themeUndoRetentionPolicy = defineRetentionPolicy(themeDefinitionSchema, {
    name: "theme_undo_retention",
    hours: 24,
})
```

This should expand to a stale guard equivalent to:

```txt
delta.timestamp < now - 24 hours
```

---

# Convenience wrapper: `blockStaleCleanupUsingProjection(...)`

`blockStaleCleanupUsingProjection(...)` should wrap `defineStaleDeltaPolicy(...)`.

```ts
export const themeHistoryAckPolicy = blockStaleCleanupUsingProjection(themeChangeHistoryProjection)
```

This should expand to:

```ts
defineStaleDeltaPolicy(projection.schema, {
    name: `${projection.name}_acked_before_delete`,
    where({ sourceAlias }) {
        return {
            sql: `${sourceAlias}.${quoteIdentifier(projection.ackColumn)} IS NOT NULL`,
            bind: [],
        }
    },
})
```

No `generatedBy` or projection-specific option is required.

`defineChangeHistoryProjection(...)` should call this internally and attach the generated policy to the returned projection object so `generateSchema` can include it in the generated manifest.

---

## Proposed internal types

```ts
export type DeltaProjectionMode = "model" | "delta"

export type PersistedModelDelta<M extends Model> = ModelDelta<M> & {
    eventId: string
    rowid?: number
}

export type DeltaProjection<M extends Model> = {
    kind: "deltaProjection"
    name: string
    version: number
    mode: DeltaProjectionMode
    schema: ZodType<M>
    metadata: unknown
    sourceTable: string
    ackColumn: string
    target: ProjectionTableSchema
    generatedStalePolicies?: StaleDeltaPolicy<M>[]
    project?: (ctx: ModelProjectionContext<M>) => Promise<void>
    projectDelta?: (ctx: DeltaProjectionContext<M>) => Promise<void>
}

export type StaleDeltaPolicy<M extends Model> = {
    kind: "staleDeltaPolicy"
    name: string
    schema: ZodType<M>
    metadata: unknown
    sourceTable: string
    where?: (ctx: StaleDeltaSqlContext<M>) => StaleDeltaSqlCondition | string
    filter?: (ctx: StaleDeltaFilterContext<M>) => boolean | Promise<boolean>
}
```

Context objects should receive both the schema and schema metadata:

```ts
export type SchemaRuntimeContext<M extends Model> = {
    schema: ZodType<M>
    metadata: unknown
    table: ModelSchema<M>
    sourceTable: string
}
```

`ModelDelta` in `@web/solid-delta` should be updated to include an optional event id:

```ts
export type ModelDelta<M extends Model = Model> = {
    eventId?: string
    id: string
    path: ...
    value: ...
    timestamp: number
}
```

D1 persistence should always store a non-null `event_id`, generating one if `delta.eventId` is missing.

---

## Registry and generated manifest

### Runtime registry

`defineDeltaProjection(...)` and `defineStaleDeltaPolicy(...)` should register their definitions in package-level registries.

This registry is used by `generateSchema` after it imports every model module.

```ts
const deltaProjectionRegistry: DeltaProjection<any>[] = []
const staleDeltaPolicyRegistry: StaleDeltaPolicy<any>[] = []
```

### Generated manifest

`generateSchema` should generate a TypeScript file in the app, for example:

```ts
// src/generated/d1-delta-runtime.generated.ts
// Generated file. Do not edit by hand.

import { themeReadProjection, themeChangeHistoryProjection } from "../models/ThemeDefinition"
import { themeUndoRetentionPolicy } from "../models/ThemeDefinition"

export const deltaProjections = [
    themeReadProjection,
    themeChangeHistoryProjection,
] as const

export const staleDataPolicies = [
    ...themeChangeHistoryProjection.generatedStalePolicies,
    themeUndoRetentionPolicy,
] as const
```

This keeps the user-facing API clean while allowing static Worker imports.

---

## Migration generation changes

### Delta source table changes

Update `createModelSchema(...)` to include an explicit event id:

```sql
event_id TEXT NOT NULL PRIMARY KEY,
id TEXT NOT NULL,
path TEXT NOT NULL,
value TEXT,
timestamp INTEGER NOT NULL
```

No old-data migration path is required yet. If existing local/dev data breaks, delete and recreate the D1 database/migrations as needed.

Indexes:

```sql
CREATE INDEX IF NOT EXISTS "<table>_id_idx" ON "<table>" ("id");
CREATE INDEX IF NOT EXISTS "<table>_timestamp_idx" ON "<table>" ("timestamp");
CREATE INDEX IF NOT EXISTS "<table>_id_path_timestamp_idx" ON "<table>" ("id", "path", "timestamp");
```

### Projection target tables

For each projection:

- emit the target table SQL,
- emit target indexes.

For `defineReadModelProjection(...)`, target SQL is inferred from the Zod schema unless overridden.

### Ack columns

For each projection, add an ack column to the source delta table:

```sql
ALTER TABLE "theme_events"
ADD COLUMN "theme_read_v1_acked_at" INTEGER;
```

Also add a pending-work index:

```sql
CREATE INDEX IF NOT EXISTS "theme_events_theme_read_v1_pending_idx"
ON "theme_events" ("theme_read_v1_acked_at", "timestamp");
```

Ack column naming:

```ts
`${projection.name}_v${projection.version}_acked_at`
```

Sanitize names before using them as SQL identifiers.

---

## Projection runner

Worker usage:

```ts
import { runDeltaProjections } from "@web/d1"
import { deltaProjections } from "./generated/d1-delta-runtime.generated"

export default {
    async scheduled(controller, env, ctx) {
        ctx.waitUntil(
            runDeltaProjections({
                db: env.DB,
                projections: deltaProjections,
            })
        )
    },
}
```

### Model projection flow

For `mode: "model"`:

1. Query pending source rows where `ackColumn IS NULL`.
2. Collect affected model ids.
3. Fetch all deltas for those model ids.
4. Rebuild each model using `createModel(...)` from `@web/solid-delta`.
5. Call `projection.project({ db, id, model, deltas, newDeltas })`.
6. Mark pending source rows acked.

`defineReadModelProjection(...)` should use this flow internally.

### Delta projection flow

For `mode: "delta"`:

1. Query pending source rows where `ackColumn IS NULL`.
2. For each pending delta, call `projection.projectDelta({ db, delta })`.
3. Mark source rows acked.

`defineChangeHistoryProjection(...)` should use this flow internally.

### Acking

Ack by `event_id`:

```sql
UPDATE "theme_events"
SET "theme_read_v1_acked_at" = ?
WHERE "event_id" IN (?, ?, ...)
```

---

## Stale cleanup runner

Worker usage:

```ts
import { runStaleDeltaCleanup } from "@web/d1"
import { staleDataPolicies } from "./generated/d1-delta-runtime.generated"

export default {
    async scheduled(controller, env, ctx) {
        ctx.waitUntil(
            runStaleDeltaCleanup({
                db: env.DB,
                policies: staleDataPolicies,
            })
        )
    },
}
```

### Cleanup rule

```txt
A delta can be deleted only if:
1. it is stale according to the base stale algorithm,
2. every stale guard allows deletion.
```

### Conservative v1 base stale algorithm

Start with only superseded field deltas:

```txt
A delta is base-stale if:
- path is not "",
- path does not contain "$array" initially,
- there exists a newer delta with the same id + path.
```

Do not initially delete:

- create deltas,
- delete deltas,
- array structural deltas,
- latest field deltas.

Candidate SQL shape:

```sql
SELECT old.event_id, old.id, old.path, old.value, old.timestamp
FROM "theme_events" AS old
WHERE old.path != ''
  AND old.path NOT LIKE '%$array%'
  AND EXISTS (
      SELECT 1
      FROM "theme_events" AS newer
      WHERE newer.id = old.id
        AND newer.path = old.path
        AND newer.timestamp > old.timestamp
  )
  -- extra SQL stale guards appended here
LIMIT ?;
```

After SQL guards, run JavaScript `filter` guards before deleting.

---

## Idempotency guidance

Projection code must tolerate repeated processing.

Use:

- `INSERT ... ON CONFLICT(primary_key) DO UPDATE` for read-model/link tables.
- `INSERT OR IGNORE` for append-only history tables keyed by `event_id`.

Avoid non-idempotent increments such as:

```sql
UPDATE stats SET count = count + 1
```

unless the count is derived from an idempotent source table or guarded by a unique event id.

---

## Implementation phases

### Phase 1: event id support

- Add optional `eventId?: string` to `ModelDelta` in `@web/solid-delta`.
- Add `event_id TEXT NOT NULL PRIMARY KEY` to `createModelSchema(...)`.
- Update `DatabaseTable.insert(...)` to write `event_id`, generating one when `delta.eventId` is missing.
- Update row conversion in `DatabaseTable.ts` to return `eventId`.
- Since nothing is in production, prefer recreating local/dev tables over backwards-compatible migration complexity.

### Phase 2: table builder and inferred read-model schemas

- Add `ProjectionTableSchemaBuilder.ts`.
- Support:
  - `addColumn(...)`,
  - `addColumnRaw(...)`,
  - `addPrimaryKey(...)`,
  - `addIndex(...)`,
  - `build()`.
- Add Zod-to-SQL inference utilities for `defineReadModelProjection(...)`.
- Export new utilities from `packages/d1/src/index.ts`.

### Phase 3: projection and stale policy definitions

- Add `DeltaProjection.ts` or `ProjectionDefinitions.ts`.
- Implement primitives first:
  - `defineDeltaProjection(...)`,
  - `defineStaleDeltaPolicy(...)`.
- Implement wrappers second:
  - `defineReadModelProjection(...)`,
  - `defineChangeHistoryProjection(...)`,
  - `defineRetentionPolicy(...)`,
  - `blockStaleCleanupUsingProjection(...)`.
- Add registries and registry getters/resetters for `generateSchema`.

### Phase 4: migration generation

- Extend `generateSchema.ts` to discover projections and stale policies.
- Emit projection target tables.
- Emit inferred read-model projection tables.
- Emit ack columns and pending indexes.
- Emit generated runtime manifest.
- Ensure deterministic ordering.

### Phase 5: projection runner

- Add `runDeltaProjections(...)`.
- Support model-mode projections.
- Support delta-mode projections.
- Ack by `event_id`.
- Keep runner independent of request context by accepting `db: D1Database` directly.

### Phase 6: stale cleanup runner

- Add `runStaleDeltaCleanup(...)`.
- Implement conservative base stale candidate query.
- Apply SQL guards.
- Apply JS filters.
- Delete by `event_id`.

### Phase 7: tests

- Add unit tests for projection definitions and generated SQL.
- Add unit tests for Zod-to-SQL read-model inference.
- Add runner tests with a SQLite/D1-compatible test database if practical.
- Add compaction/stale tests that verify projection equivalence before and after cleanup.

---

## Required compaction/stale tests

### Superseded field delta

Deleting an older same-path field delta must not change projected state.

### Delete suppresses late create

If a delete delta is known and an older create arrives later, cleanup must not have removed the delete in a way that resurrects the model.

### Delete then recreate with late field update

Cleanup must preserve current `createModel(...)` behavior, including the no-floor-on-create rule documented in `packages/solidDelta/README.md`.

### Field update arrives before create

Cleanup must not delete field deltas simply because the create delta has not arrived yet.

### Change history ack guard

Base-stale deltas must not be deleted until the generated change-history ack policy allows deletion.

### Retention guard

Base-stale deltas newer than the retention window must not be deleted.

### Projection idempotency

Running a projection twice over the same pending delta should produce the same target table state.

### Read-model inference

`defineReadModelProjection(...)` should infer expected SQL columns from representative Zod schemas, including optional fields, enums, booleans, and JSON-backed object/array fields.

---

## Open questions

1. Should generated manifests be written to `src/generated/d1-delta-runtime.generated.ts` by default, or should the output path be configurable via CLI args?
2. Which Zod types should be supported by read-model SQL inference in v1, and which should require explicit overrides?
3. Should read-model projection include every schema field by default, or exclude object/array fields unless explicitly opted in?
4. Should ack columns use `acked_at` timestamps only, or also store worker/version diagnostic metadata elsewhere?

