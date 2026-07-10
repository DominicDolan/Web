import { ZodType } from "zod";
import { Model } from "@web/schema";
import {
    defineDeltaProjection,
    DeltaProjection,
    DeltaProjectionContext,
    ProjectionTableSchema,
} from "./DeltaProjection";
import { defineProjectionAckPolicy } from "./ProjectionAckPolicy.ts";
import { quoteIdentifier } from "./SchemaRuntimeContext";

type SqlColumnType = "TEXT" | "INTEGER" | "REAL" | "BLOB"

export type ChangeHistoryExtraColumn<M extends Model> = {
    type: SqlColumnType
    value: (ctx: DeltaProjectionContext<M>) => unknown
}

export type DefineChangeHistoryProjectionOptions<M extends Model> = {
    name: string
    version: number
    /** Defaults to `name`. */
    tableName?: string
    /** Defaults to `model_id`. */
    modelIdColumn?: string
    extraColumns?: Record<string, ChangeHistoryExtraColumn<M>>
}

function serializeValue(value: unknown) {
    if (value === undefined || value === null) return null
    if (typeof value === "object") return JSON.stringify(value)
    return value
}

/**
 * Convenience wrapper around `defineDeltaProjection(...)` (mode: "delta") that
 * appends every source delta into an append-only change-history table, keyed
 * idempotently by `event_id`. Also attaches a generated stale-cleanup policy
 * (via `defineProjectionAckPolicy(...)`) requiring this projection to
 * have acked a delta before it may be deleted.
 */
export function defineChangeHistoryProjection<M extends Model>(
    schema: ZodType<M>,
    options: DefineChangeHistoryProjectionOptions<M>,
): DeltaProjection<M> {
    const tableName = options.tableName ?? options.name
    const modelIdColumn = options.modelIdColumn ?? "model_id"
    const extraColumnNames = Object.keys(options.extraColumns ?? {})

    const quotedTableName = quoteIdentifier(tableName)

    const columnClauses = [
        `"event_id" TEXT PRIMARY KEY`,
        `${quoteIdentifier(modelIdColumn)} TEXT NOT NULL`,
        `"path" TEXT NOT NULL`,
        `"value" TEXT`,
        `"timestamp" INTEGER NOT NULL`,
        ...extraColumnNames.map((name) => `${quoteIdentifier(name)} ${options.extraColumns![name].type}`),
    ]

    const createTable = `CREATE TABLE IF NOT EXISTS ${quotedTableName} (\n  ${columnClauses.join(",\n  ")}\n);`

    const createIndexes = [
        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${tableName}_${modelIdColumn}_timestamp_idx`)} ON ${quotedTableName} (${quoteIdentifier(modelIdColumn)}, "timestamp");`,
        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${tableName}_path_timestamp_idx`)} ON ${quotedTableName} ("path", "timestamp");`,
    ]

    const target: ProjectionTableSchema = {
        tableName,
        sql: [createTable, ...createIndexes].join("\n"),
    }

    const insertColumns = ["event_id", modelIdColumn, "path", "value", "timestamp", ...extraColumnNames]
    const insertColumnsSql = insertColumns.map(quoteIdentifier).join(", ")
    const placeholders = insertColumns.map(() => "?").join(", ")

    const projection = defineDeltaProjection(schema, {
        name: options.name,
        version: options.version,
        mode: "delta",
        target,

        async projectDelta(ctx: DeltaProjectionContext<M>) {
            const { db, delta } = ctx

            const values = [
                delta.eventId,
                delta.id,
                delta.path,
                serializeValue(delta.value),
                delta.timestamp,
                ...extraColumnNames.map((name) => options.extraColumns![name].value(ctx)),
            ]

            await (db as any).prepare(`
                INSERT OR IGNORE INTO ${quotedTableName} (${insertColumnsSql})
                VALUES (${placeholders})
            `).bind(...values).run()
        },
    })

    projection.generatedStalePolicies = [defineProjectionAckPolicy(projection)]

    return projection
}

