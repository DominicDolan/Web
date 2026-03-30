import { getEvent } from "vinxi/http";

export function getDB(): D1Database {
    const event = getEvent();
    const db = event.context.cloudflare?.env.DB;

    if (!db) {
        throw new Error("D1 Database not initialized");
    }

    return db as D1Database;
}
