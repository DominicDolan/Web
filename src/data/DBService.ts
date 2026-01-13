import {Model, ModelData} from "~/data/Model";
import {ModelSchema} from "~/data/ModelSchemaBuilder";
import {getRequestEvent} from "solid-js/web";
import {ModelDelta} from "~/data/ModelDelta";
import {isDevelopment} from "~/packages/utils/Environment";

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

export function useDatabaseForModel<M extends Model >(sqlSchema: ModelSchema<M>) {

    return {
        getManyByGroup: async (groupBy: string) => {
            const db = await getDB()

            const sql = sqlSchema.generateSelectGroupSql()
            const {results} = await db.prepare(sql)
                .bind(groupBy)
                .all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        getOne: async (id: string) => {
            const db = await getDB()

            const sql = sqlSchema.generateSelectSingleSql()
            const {results} = await db.prepare(sql).bind(id).all<ModelEventRow>()

            return results.map(convertEventRowToModelDelta<M>)
        },
        insert: async (delta: ModelDelta<M>, group: string) => {
            const db = await getDB()

            const sql = sqlSchema.generateInsertSingle()

            await db.prepare(sql).bind(
                group, // theme_id (hardcoded to 1 as requested)
                delta.modelId,
                delta.type,
                JSON.stringify(delta.payload),
                delta.timestamp || Date.now()
            ).run()
        },
        insertMany: async (deltas: ModelDelta<M>[], group: string) => {
            const db = await getDB()

            const sql = sqlSchema.generateInsert(deltas.length)

            const bindables = deltas.flatMap(delta => [
                group,
                delta.modelId,
                delta.type,
                JSON.stringify(delta.payload),
                delta.timestamp || Date.now()
            ])

            await db.prepare(sql).bind(...bindables).run()
        },
        dbPrepare: async (sql: string | ((tableName: string) => string)) => {
            const db = await getDB()
            sql = typeof sql === "string" ? sql : sql(sqlSchema.tableName)
            return db.prepare(sql)
        }
    }
}
