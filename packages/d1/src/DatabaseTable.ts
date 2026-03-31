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

function convertEventRowToModelDelta<M extends Model>(row: ModelEventRow): ModelDelta<M> {
    let value = row.value;
    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch {
            // keep as string if not valid JSON
        }
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

    return {
        async getAll() {
            const sql = `SELECT id, path, value, MAX(timestamp) as timestamp FROM "${tableName}" GROUP BY id, path;`

            const {results} = await db.prepare(sql)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        async getOne(id: string) {
            const sql = `SELECT id, path, value, MAX(timestamp) as timestamp FROM "${tableName}" WHERE id = ? GROUP BY path;`

            const {results} = await db.prepare(sql)
                .bind(id)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        async getManyBy(column: string, value: string) {
            const sql = `SELECT id, path, value, MAX(timestamp) as timestamp FROM "${tableName}" WHERE "${column}" = ? GROUP BY id, path;`

            const {results} = await db.prepare(sql)
                .bind(value)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        async insert(delta: ModelDelta<M> | ModelDelta<M>[], extra?: Record<string, unknown>) {

            const deltaArray = Array.isArray(delta) ? delta : [delta]

            const extraColumns = extra ? Object.keys(extra) : []
            const extraValues = extra ? Object.values(extra) : []

            const columns = ['id', 'path', 'value', 'timestamp', ...extraColumns].join(', ')
            const placeholders = ['?', '?', '?', '?', ...extraColumns.map(() => '?')].join(', ')


            const valueSets = deltaArray.map(() => `(${placeholders})`).join(', ')
            const sql = `INSERT INTO "${tableName}" (${columns}) VALUES ${valueSets}`

            await db.prepare(sql).bind(
                ...deltaArray.flatMap(delta => [
                    delta.id,
                    delta.path,
                    typeof delta.value === 'object' ? JSON.stringify(delta.value) : delta.value,
                    delta.timestamp || Date.now(),
                    ...extraValues
                ])
            ).run()
        },
    }
}
