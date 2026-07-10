import { ZodType } from "zod";
import { Model } from "@web/schema";
import { ModelDelta } from "@web/solid-delta";
import type { ModelSchema } from "../ModelSchemaBuilder";

/**
 * A persisted delta row as read back from a D1 delta table.
 * `eventId` is optional on the in-memory `ModelDelta` type, but D1 persistence
 * always generates one, so projections/policies can rely on it being present.
 */
export type PersistedModelDelta<M extends Model> = ModelDelta<M> & {
    eventId: string
    rowid?: number
}

/**
 * Context shared by projection/policy runtime callbacks. Carries both the
 * schema and its resolved metadata/source table so callbacks don't need to
 * re-derive it.
 */
export type SchemaRuntimeContext<M extends Model> = {
    schema: ZodType<M>
    metadata: unknown
    table: ModelSchema<M> | undefined
    sourceTable: string
}

export function sanitizeIdentifierPart(value: string) {
    return value.replaceAll(/[^a-zA-Z0-9_]/g, "_")
}

export function quoteIdentifier(identifier: string) {
    return `"${identifier.replaceAll(`"`, `""`)}"`
}

/**
 * Resolves the source delta table name + raw metadata for a model schema by
 * reading the `table` entry registered via `.meta({ table: ... })`.
 */
export function resolveSchemaRuntimeInfo<M extends Model>(schema: ZodType<M>): { metadata: unknown; table: ModelSchema<M> | undefined; sourceTable: string } {
    const metadata = schema.meta()
    const table = (metadata as any)?.table as ModelSchema<M> | undefined
    const sourceTable = table?.tableName

    if (!sourceTable) {
        throw new Error(
            "defineDeltaProjection/defineStaleDeltaPolicy requires the schema to have table metadata. " +
            "Did you forget `.meta({ table: createModelSchema(...).build() })`?"
        )
    }

    return { metadata, table, sourceTable }
}

