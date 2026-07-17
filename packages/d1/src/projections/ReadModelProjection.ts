import { ZodType } from "zod";
import { Model } from "@web/schema";
import { createModel } from "@web/solid-delta";
import {
    defineDeltaProjection,
    DeltaProjection,
    ModelProjectionContext,
    ProjectionTableSchema,
} from "./DeltaProjection";
import { quoteIdentifier } from "./SchemaRuntimeContext";
import {
    SqlColumnType,
    toSnakeCase,
    unwrapZodType,
    inferSqlType,
    serializeColumnValue,
} from "./ColumnInference";

export type ReadModelColumnOverride = {
    type: SqlColumnType
    notNull?: boolean
}

export type DefineReadModelProjectionOptions<M extends Model> = {
    name: string
    version: number
    /** Defaults to `${name}_models`. */
    tableName?: string
    indexes?: Array<string | string[]>
    /** Rename inferred model fields to different SQL column names. */
    renameColumns?: Partial<Record<string, string>>
    /** Exclude model fields from the inferred read table. */
    exclude?: string[]
    /** Explicit column type overrides, bypassing inference for that field. */
    columns?: Partial<Record<string, ReadModelColumnOverride>>
    /** Final row mapping hook, applied before values are written. */
    mapModel?: (model: M) => Record<string, unknown>
}

type InferredColumn = {
    field: string
    column: string
    sqlType: SqlColumnType
    notNull: boolean
    isJson: boolean
}


function inferColumnsFromSchema(
    schema: ZodType<any>,
    options: {
        renameColumns?: Partial<Record<string, string>>
        exclude?: string[]
        columns?: Partial<Record<string, ReadModelColumnOverride>>
    },
): InferredColumn[] {
    const shape: Record<string, ZodType<any>> | undefined = (schema as any)?.shape

    if (!shape) {
        throw new Error("defineReadModelProjection: schema must be a z.object(...) so columns can be inferred.")
    }

    const exclude = new Set(options.exclude ?? [])
    const columns: InferredColumn[] = []

    for (const field of Object.keys(shape)) {
        if (field === "id" || field === "updatedAt") continue
        if (exclude.has(field)) continue

        const column = options.renameColumns?.[field] ?? toSnakeCase(field)
        const override = options.columns?.[field]

        if (override) {
            columns.push({ field, column, sqlType: override.type, notNull: !!override.notNull, isJson: false })
            continue
        }

        const { inner, nullable } = unwrapZodType(shape[field])
        const { sqlType, isJson } = inferSqlType(inner)
        columns.push({ field, column, sqlType, notNull: !nullable, isJson })
    }

    return columns
}

function buildTargetTableSql(tableName: string, columns: InferredColumn[], indexes?: Array<string | string[]>): string {
    const columnClauses = [
        `"id" TEXT PRIMARY KEY`,
        ...columns.map((c) => `${quoteIdentifier(c.column)} ${c.sqlType}${c.notNull ? " NOT NULL" : ""}`),
        `"updated_at" INTEGER`,
    ]

    const createTable = `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(tableName)} (\n  ${columnClauses.join(",\n  ")}\n);`

    const createIndexes = (indexes ?? []).map((idx) => {
        const cols = Array.isArray(idx) ? idx : [idx]
        const name = `${tableName}_${cols.join("_")}_idx`
        return `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(name)} ON ${quoteIdentifier(tableName)} (${cols.map(quoteIdentifier).join(", ")});`
    })

    return [createTable, ...createIndexes].join("\n")
}


/**
 * Convenience wrapper around `defineDeltaProjection(...)` (mode: "model") that
 * infers a read-model target table from the Zod schema shape, and keeps it
 * upserted/deleted as the current model changes.
 */
export function defineReadModelProjection<M extends Model>(
    schema: ZodType<M>,
    options: DefineReadModelProjectionOptions<M>,
): DeltaProjection<M> {
    const tableName = options.tableName ?? `${options.name}_models`

    const columns = inferColumnsFromSchema(schema, {
        renameColumns: options.renameColumns,
        exclude: options.exclude,
        columns: options.columns,
    })

    const target: ProjectionTableSchema = {
        tableName,
        sql: buildTargetTableSql(tableName, columns, options.indexes),
    }

    const quotedTableName = quoteIdentifier(tableName)
    const insertColumns = ["id", ...columns.map((c) => c.column), "updated_at"]
    const insertColumnsSql = insertColumns.map(quoteIdentifier).join(", ")
    const placeholders = insertColumns.map(() => "?").join(", ")
    const updateSetSql = insertColumns
        .filter((c) => c !== "id")
        .map((c) => `${quoteIdentifier(c)} = excluded.${quoteIdentifier(c)}`)
        .join(",\n                ")

    return defineDeltaProjection(schema, {
        name: options.name,
        version: options.version,
        mode: "model",
        target,

        async project(ctx: ModelProjectionContext<M>) {
            const { db, id, model } = ctx

            if (!model) {
                await (db as any).prepare(`DELETE FROM ${quotedTableName} WHERE "id" = ?`).bind(id).run()
                return
            }

            const row: any = options.mapModel ? options.mapModel(model) : model

            const values = insertColumns.map((column) => {
                if (column === "id") return row.id ?? id
                if (column === "updated_at") return row.updatedAt ?? row.updated_at ?? null

                const columnDef = columns.find((c) => c.column === column)!
                return serializeColumnValue(row[columnDef.field], columnDef.isJson)
            })

            await (db as any).prepare(`
                INSERT INTO ${quotedTableName} (${insertColumnsSql})
                VALUES (${placeholders})
                ON CONFLICT("id") DO UPDATE SET
                ${updateSetSql}
            `).bind(...values).run()
        },
    })
}

// Re-export so consumers of this file can call `createModel` directly if needed.
export { createModel }


