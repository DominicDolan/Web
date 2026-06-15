import {z, ZodType} from "zod";
import {Model} from "@web/schema";
import {ModelDelta} from "@web/solid-delta";
import {getDB} from "./Database";


type ModelEventRow = {
    id: string
    path: string
    value: any
    timestamp: number
}

type GetManyBuilder<M extends Model> = PromiseLike<ModelDelta<M>[]> & {
    byColumn(column: string, value: unknown): GetManyBuilder<M>
    byPath(path: string, value: unknown): GetManyBuilder<M>
    execute(): Promise<ModelDelta<M>[]>
}

function quoteIdentifier(identifier: string) {
    return `"${identifier.replaceAll(`"`, `""`)}"`
}

function convertEventRowToModelDelta<M extends Model>(row: ModelEventRow): ModelDelta<M> {
    let value = row.value;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch {
            // keep as string if not valid JSON
        }
    }

    if (value === null) {
        value = undefined
    }

    return {
        id: row.id,
        path: row.path as ModelDelta<M>["path"],
        value,
        timestamp: row.timestamp
    }
}

export function useDatabaseTable<M extends Model>(schema: ZodType<M>) {
    const db = getDB()
    let tableInfo: any;
    let tableName: any;
    try {
        tableInfo = z.globalRegistry.get(schema)?.table;
        tableName = (typeof tableInfo === "object" && tableInfo != null && "tableName" in tableInfo) ? tableInfo.tableName : undefined;
    } catch (e) {
        console.log(e)
    }

    const quotedTableName = quoteIdentifier(String(tableName))

    async function runGetManyQuery(columnFilters: Array<[string, unknown]>, pathFilters: Array<[string, unknown]>) {
        const sourceAlias = "source_rows"
        const filterAlias = "matching_rows"
        const conditions: string[] = []
        const bindValues: unknown[] = []

        for (const [column, value] of columnFilters) {
            conditions.push(`EXISTS (SELECT 1 FROM ${quotedTableName} AS ${filterAlias} WHERE ${filterAlias}.id = ${sourceAlias}.id AND ${filterAlias}.${quoteIdentifier(column)} = ?)`)
            bindValues.push(value)
        }

        for (const [path, value] of pathFilters) {
            conditions.push(`EXISTS (SELECT 1 FROM ${quotedTableName} AS ${filterAlias} WHERE ${filterAlias}.id = ${sourceAlias}.id AND (${filterAlias}.path = ? AND ${filterAlias}.value = ? OR ${filterAlias}.path = "" AND json_extract(${filterAlias}.value, '$.${path}') = ?))`)
            bindValues.push(path, value, value)
        }

        const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : ""
        const sql = `SELECT ${sourceAlias}.id, ${sourceAlias}.path, ${sourceAlias}.value, MAX(${sourceAlias}.timestamp) as timestamp FROM ${quotedTableName} AS ${sourceAlias}${whereClause} GROUP BY ${sourceAlias}.id, ${sourceAlias}.path;`

        const {results} = await db.prepare(sql)
            .bind(...bindValues)
            .all<ModelEventRow>()

        return results.map(convertEventRowToModelDelta<M>).toSorted((a: any, b: any) => a.timestamp - b.timestamp)
    }

    function createGetManyBuilder(): GetManyBuilder<M> {
        const columnFilters: Array<[string, unknown]> = []
        const pathFilters: Array<[string, unknown]> = []

        const execute = () => runGetManyQuery(columnFilters, pathFilters)

        const builder: GetManyBuilder<M> = {
            byColumn(column: string, value: unknown) {
                columnFilters.push([column, value])
                return builder
            },
            byPath(path: string, value: unknown) {
                pathFilters.push([path, value])
                return builder
            },
            execute,
            then(onfulfilled, onrejected) {
                return execute().then(onfulfilled, onrejected)
            }
        }

        return builder
    }

    return {
        async getAll() {
            return runGetManyQuery([], [])
        },
        async getOne(id: string) {
            const sql = `SELECT id, path, value, MAX(timestamp) as timestamp FROM ${quotedTableName} WHERE id = ? GROUP BY path;`

            const {results} = await db.prepare(sql)
                .bind(id)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>).toSorted((a: any, b: any) => a.timestamp - b.timestamp)
        },
        getMany() {
            return createGetManyBuilder()
        },
        async insert(delta: ModelDelta<M> | ModelDelta<M>[], extra?: Record<string, unknown>) {

            const deltaArray = Array.isArray(delta) ? delta : [delta]
            if (deltaArray.length === 0) return

            const extraColumns = extra ? Object.keys(extra) : []
            const extraValues = extra ? Object.values(extra) : []

            const columns = ['id', 'path', 'value', 'timestamp', ...extraColumns].join(', ')
            const placeholders = ['?', '?', '?', '?', ...extraColumns.map(() => '?')].join(', ')


            const valueSets = deltaArray.map(() => `(${placeholders})`).join(', ')
            const sql = `INSERT INTO ${quotedTableName} (${columns}) VALUES ${valueSets}`

            await db.prepare(sql).bind(
                ...deltaArray.flatMap(delta => [
                    delta.id,
                    delta.path,
                    delta.value === undefined ? null : (typeof delta.value === 'object' ? JSON.stringify(delta.value) : delta.value),
                    delta.timestamp || Date.now(),
                    ...extraValues
                ])
            ).run()
        },
    }
}
