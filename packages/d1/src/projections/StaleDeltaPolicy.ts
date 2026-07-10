import { ZodType } from "zod";
import { Model } from "@web/schema";
import {
    PersistedModelDelta,
    SchemaRuntimeContext,
    resolveSchemaRuntimeInfo,
} from "./SchemaRuntimeContext";

export type StaleDeltaSqlCondition = {
    sql: string
    bind: unknown[]
}

export type StaleDeltaSqlContext<M extends Model> = SchemaRuntimeContext<M> & {
    sourceAlias: string
}

export type StaleDeltaFilterContext<M extends Model> = SchemaRuntimeContext<M> & {
    delta: PersistedModelDelta<M>
}

export type StaleDeltaPolicy<M extends Model = any> = {
    kind: "staleDeltaPolicy"
    name: string
    schema: ZodType<M>
    metadata: unknown
    sourceTable: string
    where?: (ctx: StaleDeltaSqlContext<M>) => StaleDeltaSqlCondition | string
    filter?: (ctx: StaleDeltaFilterContext<M>) => boolean | Promise<boolean>
}

export type DefineStaleDeltaPolicyOptions<M extends Model> = {
    name: string
    where?: (ctx: StaleDeltaSqlContext<M>) => StaleDeltaSqlCondition | string
    filter?: (ctx: StaleDeltaFilterContext<M>) => boolean | Promise<boolean>
}

const staleDeltaPolicyRegistry: StaleDeltaPolicy<any>[] = []

/**
 * Registers metadata describing a stale-cleanup guard for a source delta
 * table. This only registers metadata - it does not query or mutate D1. The
 * actual cleanup runner (`runStaleDeltaCleanup`) uses it later to decide
 * which rows are safe to delete.
 */
export function defineStaleDeltaPolicy<M extends Model>(
    schema: ZodType<M>,
    options: DefineStaleDeltaPolicyOptions<M>,
): StaleDeltaPolicy<M> {
    const { metadata, sourceTable } = resolveSchemaRuntimeInfo(schema)

    if (!options.where && !options.filter) {
        throw new Error(`defineStaleDeltaPolicy "${options.name}": must define at least one of "where" or "filter".`)
    }

    const policy: StaleDeltaPolicy<M> = {
        kind: "staleDeltaPolicy",
        name: options.name,
        schema,
        metadata,
        sourceTable,
        where: options.where,
        filter: options.filter,
    }

    staleDeltaPolicyRegistry.push(policy)

    return policy
}

/** Returns all stale delta policies registered so far via `defineStaleDeltaPolicy(...)`. */
export function getRegisteredStaleDeltaPolicies(): ReadonlyArray<StaleDeltaPolicy<any>> {
    return staleDeltaPolicyRegistry
}

/** Clears the stale delta policy registry. Intended for use by `generateSchema` between runs and in tests. */
export function clearStaleDeltaPolicyRegistry() {
    staleDeltaPolicyRegistry.length = 0
}

