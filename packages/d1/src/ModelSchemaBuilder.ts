import { parseCreateTable, diffSchemas, generateAlterStatements } from "./SchemaDiffer";
import { getSchemaContext } from "./SchemaContext";
import {Model} from "@web/schema";

type ForeignKey = {
    column: string
    references: string // e.g. 'themes(theme_id)'
    onDelete?: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION"
    onUpdate?: "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION"
}

type IndexDef = {
    name?: string
    columns: string[]
    unique?: boolean
}

export type ModelSqlSchemaOptions = {
    recreate?: boolean
    oldSql?: string // Previous SQL to diff against
}

/**
 * A light-weight builder for D1/SQLite CREATE TABLE statements.
 * Zod is carried for runtime validation (you can use it when reading/writing payload),
 * but SQL schema is defined by builder calls.
 */
export function createModelSchema<T extends Model>(
    tableName: string,
    options?: ModelSqlSchemaOptions
) {
    const columns: string[] = []
    const foreignKeys: ForeignKey[] = []
    const indexes: IndexDef[] = []

    columns.push(`id INTEGER PRIMARY KEY AUTOINCREMENT`)
    columns.push(`model_id TEXT NOT NULL`)
    columns.push(`payload TEXT NOT NULL`)
    columns.push(`event_type TEXT NOT NULL`)
    columns.push(`timestamp INTEGER NOT NULL`)

    indexes.push({ columns: ["timestamp"]})
    const api = {
        addColumnRaw(sql: string) {
            columns.push(sql)
            return api
        },

        addColumn(name: string, type: "TEXT" | "INTEGER" | "REAL" | "BLOB", opts?: { notNull?: boolean }) {
            columns.push(`"${name}" ${type}${opts?.notNull ? " NOT NULL" : ""}`)
            return api
        },

        addForeignKey(
            column: string,
            references: string,
            opts?: { onDelete?: ForeignKey["onDelete"]; onUpdate?: ForeignKey["onUpdate"] },
        ) {
            foreignKeys.push({ column, references, onDelete: opts?.onDelete, onUpdate: opts?.onUpdate })
            return api
        },

        addGroupByForeignKey(references: string, opts?: { onDelete?: ForeignKey["onDelete"]; onUpdate?: ForeignKey["onUpdate"] }) {
            foreignKeys.push({ column: "group_by_id", references, onDelete: opts?.onDelete, onUpdate: opts?.onUpdate })
            return api
        },

        addIndex(columns: string | string[], opts?: { name?: string; unique?: boolean }) {
            const cols = Array.isArray(columns) ? columns : [columns]
            indexes.push({ columns: cols, name: opts?.name, unique: opts?.unique })
            return api
        },

        build() {

            const fkClauses = foreignKeys.map((fk) => {
                const [refTable, refColWithParens] = fk.references.split("(")
                const refCol = refColWithParens?.replace(")", "")
                const onDelete = fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ""
                const onUpdate = fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ""
                return `FOREIGN KEY ("${fk.column}") REFERENCES "${refTable}"("${refCol}")${onDelete}${onUpdate}`
            })

            const createTable = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${[...columns, ...fkClauses].join(",\n  ")}\n);`

            const createIndexes = indexes.map((idx, i) => {
                const name =
                    idx.name ??
                    `${tableName}_${idx.columns.join("_")}_${idx.unique ? "uniq" : "idx"}_${i + 1}`
                const unique = idx.unique ? "UNIQUE " : ""
                const cols = idx.columns.map((c) => `"${c}"`).join(", ")
                return `CREATE ${unique}INDEX IF NOT EXISTS "${name}" ON "${tableName}" (${cols});`
            })

            let sql: string

            // Check for oldSql in options or from global context
            const context = getSchemaContext()
            const oldSql = options?.oldSql ?? context?.oldSchemas.get(tableName)

            // If oldSql is provided, try to generate ALTER TABLE statements
            if (oldSql) {
                const newFullSql = [createTable, ...createIndexes].join("\n")
                const oldSchema = parseCreateTable(oldSql)
                const newSchema = parseCreateTable(newFullSql)

                if (oldSchema && newSchema) {
                    const diff = diffSchemas(oldSchema, newSchema)

                    if (diff.needsRecreate || options?.recreate) {
                        // Need to recreate table
                        const dropTable = `DROP TABLE IF EXISTS "${tableName}";\n`
                        sql = [dropTable + createTable, ...createIndexes].join("\n")
                    } else if (!diff.exists) {
                        // Table doesn't exist, create it
                        sql = newFullSql
                    } else {
                        // Generate ALTER statements
                        const alterStatements = generateAlterStatements(diff, true)
                        if (alterStatements.length > 0) {
                            sql = alterStatements.join("\n")
                        } else {
                            // No changes needed
                            sql = `-- No changes needed for table "${tableName}"`
                        }
                    }
                } else {
                    // Couldn't parse, fall back to create
                    sql = [createTable, ...createIndexes].join("\n")
                }
            } else if (options?.recreate) {
                // Force recreate
                const dropTable = `DROP TABLE IF EXISTS "${tableName}";\n`
                sql = [dropTable + createTable, ...createIndexes].join("\n")
            } else {
                // Normal CREATE IF NOT EXISTS
                sql = [createTable, ...createIndexes].join("\n")
            }

            return {
                tableName,
                sql
            }
        },
    }

    return api
}

export type ModelSchema<T extends Model> = ReturnType<ReturnType<typeof createModelSchema<T>>["build"]>
