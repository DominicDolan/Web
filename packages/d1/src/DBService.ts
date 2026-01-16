import {Model, ModelData} from "./Model";
import {getRequestEvent} from "solid-js/web";
import {ModelDelta} from "./ModelDelta";
import {isDevelopment} from "@theme-builder/common/packages/utils/Environment";
import {z, ZodType} from "zod";

async function getDB(): Promise<D1Database> {
    const event = getRequestEvent();
    const cloudflareContext = event?.nativeEvent.context.cloudflare
    if (cloudflareContext != null) {
        return cloudflareContext.env.DB
    }

    if (!isDevelopment()){
        throw new Error("DB not found in Cloudflare context (and Wrangler platform proxy is dev-only).")
    }

    const wrangler = await import("wrangler")

    const platformProxy = await wrangler.getPlatformProxy()

    if (platformProxy.env.DB == null) {
        throw new Error("DB not found in env. Tried Cloudflare context and Wrangler platform proxy.")
    }
    return platformProxy.env.DB as D1Database
}

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
    const tableInfo = z.globalRegistry.get(schema)?.table
    const tableName =  (typeof tableInfo === "object" && tableInfo != null && "tableName" in tableInfo) ? tableInfo.tableName : undefined

    return {
        async getAll() {
            const db = await getDB()

            const tablesQuery = `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`
            const {results: tables} = await db.prepare(tablesQuery).all<{ name: string }>()
            console.log('Database tables:', tables.map(t => t.name))

            console.log(db)
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
        async insert(delta: ModelDelta<M>, extra?: Record<string, unknown>) {
            const db = await getDB()

            const extraColumns = extra ? Object.keys(extra) : []
            const extraValues = extra ? Object.values(extra) : []

            const columns = ['model_id', 'event_type', 'payload', 'timestamp', ...extraColumns].join(', ')
            const placeholders = ['?', '?', '?', '?', ...extraColumns.map(() => '?')].join(', ')

            const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`

            await db.prepare(sql).bind(
                delta.modelId,
                delta.type,
                JSON.stringify(delta.payload),
                delta.timestamp || Date.now(),
                ...extraValues
            ).run()
        }
    }
}
