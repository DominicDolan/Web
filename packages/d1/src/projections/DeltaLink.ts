import { ZodType } from "zod";
import { Model } from "@web/schema";
import { defineLinkProjection, LinkProjection, LinkProjectionContext, LinkReference } from "./LinkProjection";
import { ProjectionTableSchema } from "./DeltaProjection";
import { quoteIdentifier } from "./SchemaRuntimeContext";
import {
    SqlColumnType,
    toSnakeCase,
    resolveZodTypeAtPath,
    inferSqlType,
    serializeColumnValue,
    getByPath,
} from "./ColumnInference";

export type DeltaLinkColumnOverride = {
    type: SqlColumnType
    notNull?: boolean
}

export type DefineDeltaLinkOptions<PM extends Model> = {
    name: string
    version?: number
    /** Dot-paths (e.g. `"profile.theme"`) on the primary model to include as columns, unprefixed. */
    include?: string[]
    renameColumns?: Partial<Record<string, string>>
    columns?: Partial<Record<string, DeltaLinkColumnOverride>>
    indexes?: Array<string | string[]>
}

export type DeltaLinkReferenceOptions<PM extends Model, RM extends Model> = {
    /** Short alias for this reference. Used to prefix generated columns (`${as}_${column}`) and the foreign-id column (`${as}_id`). */
    as: string
    /** Dot-paths (e.g. `"profile.theme"`) on the referenced model to include as `${as}_...` columns. */
    include?: string[]
    /** Given the current primary model, which id in the referenced table does it link to? */
    on: (primary: PM) => string | null | undefined
    renameColumns?: Partial<Record<string, string>>
    columns?: Partial<Record<string, DeltaLinkColumnOverride>>
}

type ResolvedIncludeColumn = {
    path: string
    column: string
    sqlType: SqlColumnType
    notNull: boolean
    isJson: boolean
}

type InternalRef = {
    as: string
    schema: ZodType<any>
    on: (primary: any) => string | null | undefined
    idColumn: string
    columns: ResolvedIncludeColumn[]
}

export type DeltaLinkBuilder<PM extends Model, Refs extends Record<string, LinkReference<any, PM>>> = {
    /** Adds another linked/referenced table, keyed off the primary model via `on(...)`. */
    link<Name extends string, RM extends Model>(
        schema: ZodType<RM>,
        options: DeltaLinkReferenceOptions<PM, RM> & { as: Name },
    ): DeltaLinkBuilder<PM, Refs & Record<Name, LinkReference<RM, PM>>>
    /** Finalizes the builder into a registered `LinkProjection` (calls `defineLinkProjection(...)` under the hood). */
    build(): LinkProjection<PM, Refs>
}

function resolveIncludeColumns(
    schema: ZodType<any>,
    prefix: string,
    includePaths: string[] | undefined,
    renameColumns: Partial<Record<string, string>> | undefined,
    overrides: Partial<Record<string, DeltaLinkColumnOverride>> | undefined,
): ResolvedIncludeColumn[] {
    return (includePaths ?? []).map((path) => {
        const renamed = renameColumns?.[path]
        const defaultColumn = `${prefix}${toSnakeCase(path.replaceAll(".", "_"))}`
        const column = renamed ? `${prefix}${renamed}` : defaultColumn
        const override = overrides?.[path]

        if (override) {
            return { path, column, sqlType: override.type, notNull: !!override.notNull, isJson: false }
        }

        const { zodType, nullable } = resolveZodTypeAtPath(schema, path)
        const { sqlType, isJson } = inferSqlType(zodType)
        return { path, column, sqlType, notNull: !nullable, isJson }
    })
}

function createDeltaLinkBuilder<PM extends Model>(
    schema: ZodType<PM>,
    primaryOptions: DefineDeltaLinkOptions<PM>,
    primaryColumns: ResolvedIncludeColumn[],
    refs: InternalRef[],
): DeltaLinkBuilder<PM, any> {
    return {
        link(refSchema, options) {
            if (refs.some((ref) => ref.as === options.as)) {
                throw new Error(`defineDeltaLink "${primaryOptions.name}": a reference named "${options.as}" is already defined.`)
            }

            const newRef: InternalRef = {
                as: options.as,
                schema: refSchema,
                on: options.on,
                idColumn: `${toSnakeCase(options.as)}_id`,
                columns: resolveIncludeColumns(
                    refSchema,
                    `${toSnakeCase(options.as)}_`,
                    options.include,
                    options.renameColumns,
                    options.columns,
                ),
            }

            return createDeltaLinkBuilder(schema, primaryOptions, primaryColumns, [...refs, newRef])
        },

        build() {
            const tableName = primaryOptions.name
            const quotedTableName = quoteIdentifier(tableName)
            const version = primaryOptions.version ?? 1

            const idColumns: ResolvedIncludeColumn[] = refs.map((ref) => ({
                path: "",
                column: ref.idColumn,
                sqlType: "TEXT",
                notNull: false,
                isJson: false,
            }))

            const refIncludeColumns = refs.flatMap((ref) => ref.columns)

            const allColumns = [...primaryColumns, ...idColumns, ...refIncludeColumns]

            const columnClauses = [
                `"id" TEXT PRIMARY KEY`,
                ...allColumns.map((c) => `${quoteIdentifier(c.column)} ${c.sqlType}${c.notNull ? " NOT NULL" : ""}`),
            ]

            const createTable = `CREATE TABLE IF NOT EXISTS ${quotedTableName} (\n  ${columnClauses.join(",\n  ")}\n);`

            const indexStatements = [
                ...refs.map(
                    (ref) =>
                        `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(`${tableName}_${ref.idColumn}_idx`)} ON ${quotedTableName} (${quoteIdentifier(ref.idColumn)});`,
                ),
                ...(primaryOptions.indexes ?? []).map((idx) => {
                    const cols = Array.isArray(idx) ? idx : [idx]
                    const name = `${tableName}_${cols.join("_")}_idx`
                    return `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(name)} ON ${quotedTableName} (${cols.map(quoteIdentifier).join(", ")});`
                }),
            ]

            const target: ProjectionTableSchema = {
                tableName,
                sql: [createTable, ...indexStatements].join("\n"),
            }

            const insertColumns = ["id", ...allColumns.map((c) => c.column)]
            const insertColumnsSql = insertColumns.map(quoteIdentifier).join(", ")
            const placeholders = insertColumns.map(() => "?").join(", ")
            const updateSetSql = insertColumns
                .filter((c) => c !== "id")
                .map((c) => `${quoteIdentifier(c)} = excluded.${quoteIdentifier(c)}`)
                .join(",\n                ")

            const references: Record<string, LinkReference<any, PM>> = {}
            for (const ref of refs) {
                references[ref.as] = {
                    schema: ref.schema,
                    resolveId: ref.on,
                    findDependents: ({ db, id }) =>
                        (db as any)
                            .prepare(`SELECT "id" AS id FROM ${quotedTableName} WHERE ${quoteIdentifier(ref.idColumn)} = ?`)
                            .bind(id)
                            .all(),
                }
            }

            return defineLinkProjection(schema, {
                name: primaryOptions.name,
                version,
                target,
                references: references as any,

                async project(ctx: LinkProjectionContext<PM, any>) {
                    const { db, id, model, refs: resolvedRefs } = ctx

                    if (!model) {
                        await (db as any).prepare(`DELETE FROM ${quotedTableName} WHERE "id" = ?`).bind(id).run()
                        return
                    }

                    const values: unknown[] = [id]

                    for (const c of primaryColumns) {
                        values.push(serializeColumnValue(getByPath(model, c.path), c.isJson))
                    }

                    for (const ref of refs) {
                        const refId = ref.on(model)
                        values.push(refId ?? null)

                        const refModel = resolvedRefs[ref.as]
                        for (const c of ref.columns) {
                            values.push(serializeColumnValue(refModel ? getByPath(refModel, c.path) : undefined, c.isJson))
                        }
                    }

                    await (db as any)
                        .prepare(
                            `
                                INSERT INTO ${quotedTableName} (${insertColumnsSql})
                                VALUES (${placeholders})
                                ON CONFLICT("id") DO UPDATE SET
                                ${updateSetSql}
                            `,
                        )
                        .bind(...values)
                        .run()
                },
            })
        },
    }
}

/**
 * Convenience builder over `defineLinkProjection(...)` for the common
 * "link/denormalize N delta tables together" case, requiring no hand-written
 * SQL: target table, upsert/delete logic, and reverse `findDependents(...)`
 * lookups are all generated from `include` paths + `on(...)` resolvers.
 *
 * Star-schema only in v1: every `.link(...)` resolves its foreign id directly
 * from the *primary* model (not from another reference).
 *
 * @example
 * ```ts
 * export const orderWithCustomer = defineDeltaLink(orderSchema, {
 *     name: "orders_with_customer",
 *     include: ["customerId", "total"],
 * })
 *     .link(customerSchema, {
 *         as: "customer",
 *         include: ["name", "profile.theme"],
 *         on: (order) => order.customerId,
 *     })
 *     .link(warehouseSchema, {
 *         as: "warehouse",
 *         include: ["city", "zip"],
 *         on: (order) => order.warehouseId,
 *     })
 *     .build()
 * ```
 */
export function defineDeltaLink<PM extends Model>(
    schema: ZodType<PM>,
    options: DefineDeltaLinkOptions<PM>,
): DeltaLinkBuilder<PM, {}> {
    const primaryColumns = resolveIncludeColumns(schema, "", options.include, options.renameColumns, options.columns)
    return createDeltaLinkBuilder(schema, options, primaryColumns, [])
}

