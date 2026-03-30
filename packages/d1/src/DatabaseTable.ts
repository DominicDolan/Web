import {z, ZodType} from "zod";
import {Model, ModelData} from "@web/schema";
import {ModelDelta} from "@web/solid-delta";
import {getDB} from "./Database";


type ModelEventRow = {
    id: string
    model_id: string
    event_type: string
    payload: string
    timestamp: number
}

function convertEventRowToModelDelta<M extends Model>(row: ModelEventRow): ModelDelta<M> {
    return {
        modelId: row.model_id,
        type: row.event_type as ModelDelta<M>["type"],
        payload: JSON.parse(row.payload) as ModelData<M>,
        timestamp: row.timestamp
    }
}

export function useDatabaseTable<M extends Model>(schema: ZodType<M>) {
    let tableInfo: any;
    let tableName: any;
    try {
        tableInfo = z.globalRegistry.get(schema)?.table;
        tableName = (typeof tableInfo === "object" && tableInfo != null && "tableName" in tableInfo) ? tableInfo.tableName : undefined;
    } catch (e) {
        debugger
        console.log(e)
    }

    return {
        async getAll() {
            const db = getDB()

            const tablesQuery = `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`
            const {results: tables} = await db.prepare(tablesQuery).all<{ name: string }>()

            const sql = `SELECT * FROM "${tableName}";`

            const {results} = await db.prepare(sql)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        async getOne(id: string) {
            const db = await getDB()
            const sql = `SELECT * FROM "${tableName}" WHERE model_id = ?;`

            const {results} = await db.prepare(sql)
                .bind(id)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        async getManyBy(column: string, value: string) {
            const db = await getDB()
            const sql = `SELECT * FROM "${tableName}" WHERE ${column} = ? ORDER BY timestamp ASC;`

            const {results} = await db.prepare(sql)
                .bind(value)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        async insert(delta: ModelDelta<M> | ModelDelta<M>[], extra?: Record<string, unknown>) {
            const db = await getDB()

            const deltaArray = Array.isArray(delta) ? delta : [delta]

            const extraColumns = extra ? Object.keys(extra) : []
            const extraValues = extra ? Object.values(extra) : []

            const columns = ['model_id', 'event_type', 'payload', 'timestamp', ...extraColumns].join(', ')
            const placeholders = ['?', '?', '?', '?', ...extraColumns.map(() => '?')].join(', ')


            const valueSets = deltaArray.map(() => `(${placeholders})`).join(', ')
            const sql = `INSERT INTO "${tableName}" (${columns}) VALUES ${valueSets}`

            await db.prepare(sql).bind(
                ...deltaArray.flatMap(delta => [
                    delta.modelId,
                    delta.type,
                    JSON.stringify(delta.payload),
                    delta.timestamp || Date.now(),
                    ...extraValues
                ])
            ).run()
        },
    }
}
