# D1 Delta Projections

`packages/d1/src/projections` lets you keep writes simple and append-only in
delta tables, while Cloudflare Workers maintain optimized derived tables
alongside them: read-model tables, linking/join tables, search/index tables,
change-history tables, and other materialized views.

A **delta table** stores an append-only change log (`event_id`, `id`, `path`,
`value`, `timestamp`) rather than current rows - see `createModelSchema(...)`
in `packages/d1/src/ModelSchemaBuilder.ts` and `packages/solid-delta` for how
deltas are written and folded into a current model via `createModel(...)`. A
**projection** turns that change log into a normal SQL table you can query
directly (with indexes, joins, `WHERE`, etc.).

## At a glance

| Concern | API | File |
| --- | --- | --- |
| Turn deltas into any target table | `defineDeltaProjection(...)` | `DeltaProjection.ts` |
| Guard which stale deltas can be deleted | `defineStaleDeltaPolicy(...)` | `StaleDeltaPolicy.ts` |
| Infer a read-model table from a schema | `defineReadModelProjection(...)` | `ReadModelProjection.ts` |
| Append-only change history | `defineChangeHistoryProjection(...)` | `ChangeHistoryProjection.ts` |
| Require a projection to ack before delete | `defineProjectionAckPolicy(...)` | `ProjectionAckPolicy.ts` |
| Join/link 2+ delta tables (low-level) | `defineLinkProjection(...)` | `LinkProjection.ts` |
| Join/link 2+ delta tables (zero-SQL builder) | `defineDeltaLink(...)` | `DeltaLink.ts` |
| Shared Zod → SQL column inference | - | `ColumnInference.ts` |
| Shared runner SQL helpers | - | `ProjectionRunnerShared.ts` |
| Run pending delta/link projections | `runDeltaProjections(...)`, `runLinkProjections(...)` | `RunDeltaProjections.ts`, `RunLinkProjections.ts` |
| Run stale-delta cleanup | `runStaleDeltaCleanup(...)` | `RunStaleDeltaCleanup.ts` |
| Run against local Wrangler D1 (dev/CLI) | `runDeltaProjectionsLocal(...)`, `runStaleDeltaCleanupLocal(...)` | `RunDeltaProjectionsLocal.ts`, `RunStaleDeltaCleanupLocal.ts` |

All of the above are re-exported from `@web/d1` via `packages/d1/src/projections/index.ts` (and `packages/d1/src/index.ts`).

## How the pieces fit together

1. **Projection/policy declarations live next to model schemas** (e.g.
   `apps/theme-builder/src/models/ThemeDefinition.ts`) and are metadata only.
   Calling `defineDeltaProjection(...)`, `defineLinkProjection(...)`,
   `defineDeltaLink(...)`, or `defineStaleDeltaPolicy(...)` at module load
   registers metadata in an in-memory registry - it never queries or mutates
   D1, starts timers, or runs projection work.
2. **Runners do the actual work.** `runDeltaProjections(...)`,
   `runLinkProjections(...)`, and `runStaleDeltaCleanup(...)` take an explicit
   `db` handle (a real `D1Database` or the local `node:sqlite`-backed adapter
   used by the `*Local` variants) plus the registered projections/policies,
   and are meant to be called from a Worker's `scheduled(...)` handler (or a
   local dev/CLI script).
3. **Stale cleanup is separate from projection declaration.** A projection
   never declares retention/cleanup options directly - only
   `defineStaleDeltaPolicy(...)` (and `defineProjectionAckPolicy(...)`, which
   wraps it) can guard whether a stale delta is safe to delete.
4. **Projection writes are idempotent.** Workers can crash or retry after
   writing target rows but before marking source deltas as acked, so every
   built-in wrapper uses `INSERT ... ON CONFLICT(...) DO UPDATE` (read models,
   link tables) or `INSERT OR IGNORE` keyed by `event_id` (change history).
5. **Every persisted delta row has an `event_id`.** `PersistedModelDelta` in
   `SchemaRuntimeContext.ts` requires it; projection acking, change history,
   and idempotency are all keyed off it.
6. **One schema = one source delta table.** Every primitive resolves its
   `sourceTable` by reading `schema.meta().table.tableName`, so a schema must
   have `.meta({ table: createModelSchema(...).build() })` before any
   projection/policy can be defined against it.

---

## Base model schema

Every projection/policy primitive takes the Zod schema for a delta table.
Internally it reads `schema.meta().table` to find the source table name:

```ts
import { z } from "zod"
import { modelSchema } from "@web/schema"
import { createModelSchema } from "@web/d1"

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

---

## Primitive: `defineDeltaProjection(...)`

`defineDeltaProjection(...)` describes how to turn source deltas into a
derived target table. It registers:

- the source Zod schema + resolved `sourceTable`,
- an ack column name: `` `${name}_v${version}_acked_at` `` (sanitized via
  `sanitizeIdentifierPart(...)`),
- a target table (`{ tableName, sql }` - just plain `CREATE TABLE`/`CREATE
  INDEX` SQL; there's no table-builder helper for this yet, see
  [Known gaps](#known-gaps-vs-a-fully-generic-system)),
- either a `project(...)` callback (`mode: "model"`) or a `projectDelta(...)`
  callback (`mode: "delta"`).

### Model-mode example

Model-mode projections rebuild the current model with `createModel(...)` (from
`@web/solid-delta`) for every affected id, then call `project(...)` once per id:

```ts
export const customThemeProjection = defineDeltaProjection(themeDefinitionSchema, {
    name: "custom_theme_projection",
    version: 1,
    mode: "model",

    target: {
        tableName: "custom_theme_projection_table",
        sql: `
            CREATE TABLE IF NOT EXISTS "custom_theme_projection_table" (
              "id" TEXT PRIMARY KEY,
              "name" TEXT NOT NULL
            );
        `,
    },

    async project({ db, id, model }) {
        if (!model) {
            await (db as any).prepare(`DELETE FROM custom_theme_projection_table WHERE id = ?`).bind(id).run()
            return
        }

        await (db as any).prepare(`
            INSERT INTO custom_theme_projection_table (id, name)
            VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name
        `).bind(model.id, model.name).run()
    },
})
```

### Delta-mode example

Delta-mode projections process each new persisted delta directly - useful for
append-only history/audit tables:

```ts
export const rawThemeHistoryProjection = defineDeltaProjection(themeDefinitionSchema, {
    name: "raw_theme_history",
    version: 1,
    mode: "delta",

    target: {
        tableName: "raw_theme_history",
        sql: `
            CREATE TABLE IF NOT EXISTS "raw_theme_history" (
              "event_id" TEXT PRIMARY KEY,
              "model_id" TEXT NOT NULL,
              "path" TEXT NOT NULL,
              "value" TEXT,
              "timestamp" INTEGER NOT NULL
            );
        `,
    },

    async projectDelta({ db, delta }) {
        await (db as any).prepare(`
            INSERT OR IGNORE INTO raw_theme_history (event_id, model_id, path, value, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `).bind(delta.eventId, delta.id, delta.path, JSON.stringify(delta.value ?? null), delta.timestamp).run()
    },
})
```

### Ack columns and pending work

Every projection's ack column is added to its source table:

```sql
ALTER TABLE "theme_events" ADD COLUMN "custom_theme_projection_v1_acked_at" INTEGER;
```

The runner finds pending rows with it:

```sql
SELECT event_id, id, path, value, timestamp
FROM "theme_events"
WHERE "custom_theme_projection_v1_acked_at" IS NULL
ORDER BY timestamp
LIMIT ?;
```

`generateSchema` (see [Schema generation](#schema-generation) below) emits
this `ALTER TABLE` plus a pending-work index automatically the first time a
projection is introduced.

---

## Primitive: `defineStaleDeltaPolicy(...)`

`defineStaleDeltaPolicy(...)` defines a cleanup **guard** - it doesn't decide
what's stale by itself, it only narrows what the base stale algorithm (in
`runStaleDeltaCleanup(...)`) is allowed to delete:

```txt
A delta can be deleted only if:
1. the base stale algorithm says it's stale, AND
2. every registered stale guard for that source table allows deletion.
```

A policy can provide `where(...)` (a SQL condition evaluated while selecting
candidates - preferred, since SQLite/D1 can filter before rows reach
JavaScript) and/or `filter(...)` (a JS predicate evaluated per candidate row
after loading). At least one is required.

```ts
export const themeImportantDeltaGuard = defineStaleDeltaPolicy(themeDefinitionSchema, {
    name: "theme_important_delta_guard",

    where({ sourceAlias }) {
        return { sql: `${sourceAlias}.path != ?`, bind: ["important"] }
    },

    filter({ delta }) {
        return !String(delta.value).includes("keep")
    },
})
```

---

## Wrapper: `defineReadModelProjection(...)`

Infers a "current state" read table straight from the Zod schema shape - no
manual SQL, no manual `project(...)`:

```ts
export const themeReadProjection = defineReadModelProjection(themeDefinitionSchema, {
    name: "theme_read",
    version: 1,
})
```

This infers a target table name (`${name}_models` unless `tableName` is
given), infers SQL columns from the schema (see the type table below), keeps
rows upserted via `createModel(...)` on every affected id, and deletes the row
when the model is deleted. Every option is overridable:

```ts
export const themeReadProjection = defineReadModelProjection(themeDefinitionSchema, {
    name: "theme_read",
    version: 1,
    tableName: "theme_read_models",
    indexes: [["mode"], ["class"]],
    renameColumns: { updatedAt: "updated_at" },
    exclude: ["largeJsonBlob"],
    columns: { mode: { type: "TEXT", notNull: true } }, // explicit override, bypasses inference
    mapModel(model) {
        return { ...model, updated_at: model.updatedAt }
    },
})
```

Column inference (`ColumnInference.ts`, shared with `defineDeltaLink(...)`):

| Zod type | SQL type |
| --- | --- |
| `z.string()` | `TEXT` |
| `z.number()` | `REAL` |
| `z.boolean()` | `INTEGER` (`0`/`1`) |
| `z.enum(...)` | `TEXT` |
| `z.literal(...)` | inferred from the literal's JS type |
| optional/nullable/default | column is nullable, wrapper is unwrapped first |
| anything else (arrays, objects, records, unions) | `TEXT` containing JSON |

`id` and `updatedAt` are always handled specially (`id TEXT PRIMARY KEY`,
`updated_at INTEGER`) and excluded from inference.

Internally this expands to a `mode: "model"` `defineDeltaProjection(...)`.

---

## Wrapper: `defineChangeHistoryProjection(...)`

Append-only, idempotent change history with almost no config:

```ts
export const themeChangeHistoryProjection = defineChangeHistoryProjection(themeDefinitionSchema, {
    name: "theme_change_history",
    version: 1,
})
```

This creates a `mode: "delta"` projection that `INSERT OR IGNORE`s every delta
(keyed by `event_id`) into a table shaped like:

```sql
CREATE TABLE IF NOT EXISTS "theme_change_history" (
  "event_id" TEXT PRIMARY KEY,
  "model_id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "value" TEXT,
  "timestamp" INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "theme_change_history_model_id_timestamp_idx" ON "theme_change_history" ("model_id", "timestamp");
CREATE INDEX IF NOT EXISTS "theme_change_history_path_timestamp_idx" ON "theme_change_history" ("path", "timestamp");
```

...and automatically attaches a generated `defineProjectionAckPolicy(...)` (see
below) to `projection.generatedStalePolicies`, so stale cleanup can never
delete a delta this projection hasn't acked yet. Overridable options:
`tableName`, `modelIdColumn` (defaults to `model_id`), and `extraColumns` (each
with a `type` and a `value({ delta }) => unknown` getter).

---

## Wrapper: `defineProjectionAckPolicy(...)`

Wraps `defineStaleDeltaPolicy(...)` to require a specific projection to have
acked a delta before cleanup may delete it:

```ts
export const themeHistoryAckPolicy = defineProjectionAckPolicy(themeChangeHistoryProjection)
```

Equivalent to:

```ts
defineStaleDeltaPolicy(projection.schema, {
    name: `${projection.name}_acked_before_delete`,
    where: ({ sourceAlias }) => ({
        sql: `${sourceAlias}.${quoteIdentifier(projection.ackColumn)} IS NOT NULL`,
        bind: [],
    }),
})
```

`defineChangeHistoryProjection(...)` calls this internally.

---

## Primitive: `defineLinkProjection(...)` (joining 2+ delta tables)

Joining raw deltas across tables in SQL is impractical - deltas are a change
log, not current rows. `defineLinkProjection(...)` handles the common
"link/denormalize" case: one **primary** source drives one output row each,
enriched with data resolved from one or more **referenced** sources via a
foreign id.

```ts
export const orderWithCustomerProjection = defineLinkProjection(orderSchema, {
    name: "order_with_customer",
    version: 1,

    target: {
        tableName: "orders_with_customers",
        sql: `
            CREATE TABLE IF NOT EXISTS "orders_with_customers" (
              "order_id" TEXT PRIMARY KEY,
              "customer_id" TEXT NOT NULL,
              "customer_name" TEXT
            );
            CREATE INDEX IF NOT EXISTS "orders_with_customers_customer_id_idx" ON "orders_with_customers" ("customer_id");
        `,
    },

    references: {
        customer: {
            schema: customerSchema,
            // Given the current primary (order) model, which foreign id does it reference?
            resolveId: (order) => order.customerId,
            // Given a foreign (customer) id that just changed, which primary (order)
            // ids currently depend on it? Answered cheaply by querying the link
            // table itself, since it already stores customer_id.
            findDependents: ({ db, id }) =>
                (db as any).prepare(`SELECT order_id AS id FROM orders_with_customers WHERE customer_id = ?`).bind(id).all(),
        },
    },

    async project({ db, id, model: order, refs: { customer } }) {
        if (!order) {
            await (db as any).prepare(`DELETE FROM orders_with_customers WHERE order_id = ?`).bind(id).run()
            return
        }

        await (db as any).prepare(`
            INSERT INTO orders_with_customers (order_id, customer_id, customer_name)
            VALUES (?, ?, ?)
            ON CONFLICT(order_id) DO UPDATE SET
                customer_id = excluded.customer_id,
                customer_name = excluded.customer_name
        `).bind(id, order.customerId, customer?.name ?? null).run()
    },
})
```

### How it stays consistent without a real SQL join

Each source (primary + every reference) gets its own ack column, following
the same `${name}_v${version}_acked_at` convention as
`defineDeltaProjection(...)` (reference ack columns are namespaced
`${name}_${refName}_v${version}_acked_at`). `runLinkProjections(...)`
processes two directions every run:

1. **Primary source changed.** For each pending primary delta, group by model
   id, rebuild the primary model with `createModel(...)`, resolve every
   reference's foreign id via `resolveId(...)`, rebuild each referenced
   model, and call `project(...)`. Ack the primary deltas.
2. **A referenced source changed** (e.g. a customer's name is edited). For
   each pending delta on that reference, call `findDependents(...)` to find
   which primary rows currently depend on that foreign id, then re-run
   `project(...)` for each dependent primary id. Ack the reference's deltas.

The link/target table doubles as the reverse index needed to propagate
changes from the referenced side, without ever scanning all deltas of a
source table or requiring a real SQL join over delta rows.

### Many-to-many (junction) example

The same primitive supports many-to-many linking (e.g. post/tag) by treating
the junction model (`PostTagLink { postId, tagId }`) as the primary source,
and both `Post` and `Tag` as references - see `DeltaLink.ts`'s equivalent
example below for the zero-SQL version of this.

---

## Wrapper: `defineDeltaLink(...)` (zero-SQL link builder)

`defineLinkProjection(...)` still requires hand-written target SQL,
upsert/delete logic, and `findDependents(...)` lookups. `defineDeltaLink(...)`
is a **builder** on top of it for the common case: linking N delta tables
together with no hand-written SQL at all. It infers everything from `include`
dot-paths and `on(...)` foreign-key resolvers, reusing the same Zod → SQL
inference as `defineReadModelProjection(...)` (`ColumnInference.ts`).

```ts
export const orderWithCustomer = defineDeltaLink(orderSchema, {
    name: "orders_with_customer",
    include: ["customerId", "total"],
})
    .link(customerSchema, {
        as: "customer",
        include: ["name", "profile.theme"],
        on: (order) => order.customerId,
    })
    .link(warehouseSchema, {
        as: "warehouse",
        include: ["city", "zip"],
        on: (order) => order.warehouseId,
    })
    .build()
```

This generates a target table roughly like:

```sql
CREATE TABLE IF NOT EXISTS "orders_with_customer" (
  "id" TEXT PRIMARY KEY,
  "customer_id" TEXT,
  "total" REAL,
  "customer_id" TEXT,
  "warehouse_id" TEXT,
  "customer_name" TEXT,
  "customer_profile_theme" TEXT,
  "warehouse_city" TEXT,
  "warehouse_zip" TEXT
);
CREATE INDEX IF NOT EXISTS "orders_with_customer_customer_id_idx" ON "orders_with_customer" ("customer_id");
CREATE INDEX IF NOT EXISTS "orders_with_customer_warehouse_id_idx" ON "orders_with_customer" ("warehouse_id");
```

- `id` is always the primary model's id.
- Every `.link(...)` reference gets a hidden `${as}_id` column (the resolved
  foreign id from `on(...)`) plus an index, regardless of whether any fields
  from that reference are `include`d.
- Every `include`d field is prefixed for references (`${as}_${column}`, e.g.
  `customer_profile_theme`) but left unprefixed for the primary table -
  pick non-colliding field names or use `renameColumns` to disambiguate.
- `findDependents(...)` for each reference is auto-generated as a query
  against the link projection's own target table:
  `SELECT "id" FROM "orders_with_customer" WHERE "customer_id" = ?`.
- `project(...)` is auto-generated: builds the row from primary `include`
  paths + each reference's `${as}_id` + `include` paths, then
  `INSERT ... ON CONFLICT("id") DO UPDATE`; deletes the row when the primary
  model is gone.

### Many-to-many (junction) example

```ts
export const postTagLink = defineDeltaLink(postTagLinkSchema, {
    name: "post_tag_links",
})
    .link(postSchema, { as: "post", include: ["title"], on: (link) => link.postId })
    .link(tagSchema, { as: "tag", include: ["name"], on: (link) => link.tagId })
    .build()
```

### Current limitations

- **Star schema only.** Every `.link(...)`'s `on(...)` resolves its foreign id
  directly from the *primary* model - a reference can't depend on another
  reference's id yet. Use `defineLinkProjection(...)` directly for that.
- **`include` paths must resolve to primitive leaves** (string/number/boolean/
  enum/literal); anything else is stored as JSON text, same rule as
  `defineReadModelProjection(...)`.
- It's a thin builder over `defineLinkProjection(...)`, so it's registered and
  runs identically once `.build()` is called.

---

## Runners

### `runDeltaProjections({ db, projections, batchSize? })`

For each registered `DeltaProjection`: ensures the target table + ack column
exist, then repeatedly fetches pending rows (`ackColumn IS NULL`, ordered by
`timestamp`, batched - default `batchSize: 200`) and processes them:

- **`mode: "model"`**: groups pending rows by model id, loads every delta for
  those ids, rebuilds each model with `createModel(...)`, calls
  `project({ db, id, model, deltas, newDeltas, ... })`.
- **`mode: "delta"`**: calls `projectDelta({ db, delta, ... })` once per
  pending row.

Then acks the processed rows by `event_id`. Safe to call repeatedly - it's a
loop that only stops once a batch comes back smaller than `batchSize`.

### `runLinkProjections({ db, projections, batchSize? })`

Same idea for `LinkProjection`s (see [`defineLinkProjection(...)`](#primitive-definelinkprojection-joining-2-delta-tables)
above for the two-direction algorithm). Returns
`{ name, sourceTable, processedPrimary, processedReferences }` per projection.

### `runStaleDeltaCleanup({ db, policies, sourceTables?, batchSize? })`

Runs one conservative cleanup pass per source table. The **base stale
algorithm** only considers a delta a candidate if:

```txt
- its path is not "" (i.e. not a create/whole-model delta),
- its path does not contain "$array" (array-structural deltas are untouched),
- a newer delta exists with the same id + path (it's been superseded).
```

Every SQL guard (`policy.where(...)`) from every registered
`StaleDeltaPolicy` for that source table is AND-ed into the candidate query;
every JS guard (`policy.filter(...)`) then re-checks each loaded candidate.
Only candidates that pass every guard are deleted (by `event_id`). Passing
`sourceTables` lets you clean tables that have no stale-policy guards at all.

### Local dev variants

`runDeltaProjectionsLocal(...)` and `runStaleDeltaCleanupLocal(...)` (in
`RunDeltaProjectionsLocal.ts` / `RunStaleDeltaCleanupLocal.ts`) wrap the above
for local development: they `import(...)` every model module under a
`modelsDir` (default `src/models`) to populate the registries (which also
runs any `defineDeltaProjection(...)`/`defineDeltaLink(...)`/etc. calls at
module top-level), open a local D1 binding via Wrangler's
`getPlatformProxy(...)`, and run against it. Useful for a `package.json`
script during development instead of waiting for a scheduled Worker.

### Worker usage

```ts
import { runDeltaProjections, runLinkProjections, runStaleDeltaCleanup } from "@web/d1"
import { getRegisteredDeltaProjections } from "@web/d1"
import { getRegisteredLinkProjections } from "@web/d1"
import { getRegisteredStaleDeltaPolicies } from "@web/d1"
// ...import every model module first, so the calls above populate the registries.

export default {
    async scheduled(controller, env, ctx) {
        ctx.waitUntil(Promise.all([
            runDeltaProjections({ db: env.DB, projections: getRegisteredDeltaProjections() }),
            runLinkProjections({ db: env.DB, projections: getRegisteredLinkProjections() }),
            runStaleDeltaCleanup({ db: env.DB, policies: getRegisteredStaleDeltaPolicies() }),
        ]))
    },
}
```

---

## Schema generation

`packages/d1/src/generateSchema.ts` is a CLI (`tsx generateSchema.ts
[modelsDir] [migrationsDir]`) that imports every model module under
`modelsDir`, diffs the resulting SQL against previously-generated migrations
(via `SchemaDiffer.ts`/`SchemaContext.ts`), and writes a new
`NNNN_generated.sql` migration file only when something changed. For
registered `DeltaProjection`s, it also emits (the first time each is
introduced):

- the projection's target table SQL,
- an `ALTER TABLE ... ADD COLUMN <ackColumn> INTEGER` on the source table,
- a pending-work index: `CREATE INDEX ... ON <sourceTable> (<ackColumn>, "timestamp")`.

## Idempotency guidance

Projection writes must tolerate repeated processing (a Worker can crash after
writing target rows but before acking source deltas). Use
`INSERT ... ON CONFLICT(primary_key) DO UPDATE` for read-model/link tables, and
`INSERT OR IGNORE` keyed by `event_id` for append-only history tables. Avoid
non-idempotent increments (`UPDATE stats SET count = count + 1`) unless the
count is derived from an idempotent source or guarded by a unique event id.

## Known gaps (vs. a fully generic system)

This package covers the common cases described above, but a few things
mentioned in earlier design discussions aren't built yet:

- **No `defineRetentionPolicy(...)` wrapper.** Time-based retention
  (`delta.timestamp < now - N hours`) isn't implemented as a named helper
  yet - write a `defineStaleDeltaPolicy(...)` with a `where`/`filter` guard
  comparing `delta.timestamp` directly in the meantime.
- **No `ProjectionTableSchemaBuilder`/`createProjectionTable(...)` helper.**
  `defineDeltaProjection(...)`/`defineLinkProjection(...)` target tables are
  plain `{ tableName, sql }` values - write the `CREATE TABLE`/`CREATE INDEX`
  SQL by hand (as in the examples above), or use
  `defineReadModelProjection(...)`/`defineDeltaLink(...)` when their inferred
  tables are enough.
- **`generateSchema.ts` only wires up `DeltaProjection`s.** `StaleDeltaPolicy`,
  `LinkProjection`, and `DeltaLink` registrations are not yet discovered by
  the migration generator, so their target tables/ack columns must currently
  be created another way (e.g. include the SQL directly in a schema module,
  or run `runLinkProjections(...)`/`runStaleDeltaCleanup(...)` once against a
  fresh database, which will `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE` them
  on first run).
- **No generated runtime manifest file.** There's no
  `src/generated/d1-delta-runtime.generated.ts` step - Workers should import
  model modules directly and call `getRegisteredDeltaProjections()` /
  `getRegisteredLinkProjections()` / `getRegisteredStaleDeltaPolicies()`
  themselves, as shown in [Worker usage](#worker-usage) above.
- **No automated test suite yet** for projection definitions, generated SQL,
  Zod-to-SQL inference, or stale-cleanup/compaction correctness.

