import { ZodType } from "zod";
import { Model } from "@web/schema";
import type { StaleDeltaPolicy } from "./StaleDeltaPolicy";
import {
    PersistedModelDelta,
    SchemaRuntimeContext,
    resolveSchemaRuntimeInfo,
    sanitizeIdentifierPart,
} from "./SchemaRuntimeContext";

/**
 * Minimal shape of a projection target table definition.
 * This matches the shape produced by `createModelSchema(...).build()` today
 * (`{ tableName, sql }`). A dedicated `ProjectionTableSchemaBuilder` can be
 * added later without changing this shape.
 */
export type ProjectionTableSchema = {
    tableName: string
    sql: string
}

export type DeltaProjectionMode = "model" | "delta"

export type ModelProjectionContext<M extends Model> = SchemaRuntimeContext<M> & {
    db: unknown
    id: string
    model: M | undefined
    deltas?: PersistedModelDelta<M>[]
    newDeltas?: PersistedModelDelta<M>[]
}

export type DeltaProjectionContext<M extends Model> = SchemaRuntimeContext<M> & {
    db: unknown
    delta: PersistedModelDelta<M>
}

export type DeltaProjection<M extends Model = any> = {
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

export type DefineDeltaProjectionOptions<M extends Model> = {
    name: string
    version: number
    mode: DeltaProjectionMode
    target: ProjectionTableSchema
    project?: (ctx: ModelProjectionContext<M>) => Promise<void>
    projectDelta?: (ctx: DeltaProjectionContext<M>) => Promise<void>
}

const deltaProjectionRegistry: DeltaProjection<any>[] = []

/**
 * Computes the ack column name for a projection: `${name}_v${version}_acked_at`,
 * sanitized so it is safe to use as a SQL identifier.
 */
export function getProjectionAckColumn(name: string, version: number) {
    return `${sanitizeIdentifierPart(name)}_v${version}_acked_at`
}

/**
 * Registers metadata describing how to turn source deltas into a derived
 * target table. This only registers metadata - it does not query or mutate
 * D1, start timers, or run projection work.
 */
export function defineDeltaProjection<M extends Model>(
    schema: ZodType<M>,
    options: DefineDeltaProjectionOptions<M>,
): DeltaProjection<M> {
    const { metadata, sourceTable } = resolveSchemaRuntimeInfo(schema)

    if (options.mode === "model" && !options.project) {
        throw new Error(`defineDeltaProjection "${options.name}": mode "model" requires a "project" callback.`)
    }

    if (options.mode === "delta" && !options.projectDelta) {
        throw new Error(`defineDeltaProjection "${options.name}": mode "delta" requires a "projectDelta" callback.`)
    }

    const projection: DeltaProjection<M> = {
        kind: "deltaProjection",
        name: options.name,
        version: options.version,
        mode: options.mode,
        schema,
        metadata,
        sourceTable,
        ackColumn: getProjectionAckColumn(options.name, options.version),
        target: options.target,
        project: options.project,
        projectDelta: options.projectDelta,
    }

    deltaProjectionRegistry.push(projection)

    return projection
}

/** Returns all delta projections registered so far via `defineDeltaProjection(...)`. */
export function getRegisteredDeltaProjections(): ReadonlyArray<DeltaProjection<any>> {
    return deltaProjectionRegistry
}

/** Clears the delta projection registry. Intended for use by `generateSchema` between runs and in tests. */
export function clearDeltaProjectionRegistry() {
    deltaProjectionRegistry.length = 0
}



