import { getEvent } from "@web/server-functions/runtime"

interface CloudflareContext {
    cloudflare?: {
        env?: {
            DB?: D1Database
        }
    }
}

export function getDB(): D1Database {
    const event = getEvent<unknown, unknown, CloudflareContext>()
    const db = event.context?.cloudflare?.env?.DB

    if (!db) {
        throw new Error("D1 Database not initialized")
    }

    return db
}
