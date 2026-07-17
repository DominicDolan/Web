// noinspection SqlResolve

import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { modelSchema } from "@web/schema"
import { createModelSchema } from "../src"
import { defineDeltaProjection } from "../src"
import { defineStaleDeltaPolicy } from "../src"
import { runDeltaProjections } from "../src"
import { runStaleDeltaCleanup } from "../src"
import { InMemoryD1 } from "./InMemoryD1"

const taskTable = createModelSchema("task_events").build()
const taskSchema = z.object({
    ...modelSchema,
    title: z.string(),
    status: z.string(),
}).meta({ table: taskTable })

type Task = z.infer<typeof taskSchema>

let db: InMemoryD1 | undefined

afterEach(() => {
    db?.close()
    db = undefined
})

async function createDb() {
    db = new InMemoryD1()

    for (const statement of taskTable.sql.split(";").map((sql) => sql.trim()).filter(Boolean)) {
        await db.prepare(statement).run()
    }

    return db
}

async function insertDelta(
    db: InMemoryD1,
    eventId: string,
    id: string,
    path: string,
    value: unknown,
    timestamp: number,
) {
    await db.prepare(`
        INSERT INTO task_events (event_id, id, path, value, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `).bind(eventId, id, path, value === undefined ? null : JSON.stringify(value), timestamp).run()
}

describe("projection integration", () => {
    it("runs a model projection against an in-memory SQLite database and acks source deltas", async () => {
        const db = await createDb()
        await insertDelta(db, "evt-1", "task-1", "", { title: "Write tests", status: "todo" }, 10)
        await insertDelta(db, "evt-2", "task-1", "status", "done", 20)

        const projection = defineDeltaProjection(taskSchema, {
            name: "task_read_model",
            version: 1,
            mode: "model",
            target: {
                tableName: "task_read_models",
                sql: `
                    CREATE TABLE IF NOT EXISTS task_read_models (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        status TEXT NOT NULL,
                        updated_at INTEGER NOT NULL
                    );
                `,
            },
            async project({ db, id, model }) {
                if (!model) {
                    await db.prepare("DELETE FROM task_read_models WHERE id = ?").bind(id).run()
                    return
                }

                await db.prepare(`
                    INSERT INTO task_read_models (id, title, status, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        title = excluded.title,
                        status = excluded.status,
                        updated_at = excluded.updated_at
                `).bind(model.id, model.title, model.status, model.updatedAt).run()
            },
        })

        const summary = await runDeltaProjections({ db, projections: [projection], batchSize: 1 })

        await expect(db.prepare("SELECT id, title, status, updated_at FROM task_read_models").all()).resolves.toEqual({
            results: [{ id: "task-1", title: "Write tests", status: "done", updated_at: 20 }],
        })
        await expect(db.prepare(`SELECT COUNT(*) AS count FROM task_events WHERE "${projection.ackColumn}" IS NOT NULL`).all()).resolves.toEqual({
            results: [{ count: 2 }],
        })
        expect(summary).toEqual([{ name: "task_read_model", sourceTable: "task_events", processed: 2 }])
    })

    it("runs stale delta cleanup with SQL and JavaScript policy guards", async () => {
        const db = await createDb()
        await insertDelta(db, "evt-title-old", "task-1", "title", "First title", 10)
        await insertDelta(db, "evt-title-new", "task-1", "title", "Second title", 20)
        await insertDelta(db, "evt-status-old", "task-1", "status", "todo", 30)
        await insertDelta(db, "evt-status-new", "task-1", "status", "done", 40)
        await insertDelta(db, "evt-create", "task-1", "", { title: "Created", status: "todo" }, 1)

        const policy = defineStaleDeltaPolicy(taskSchema, {
            name: "delete_stale_title_deltas",
            where({ sourceAlias }) {
                return { sql: `${sourceAlias}.path = ?`, bind: ["title"] }
            },
            filter({ delta }) {
                return delta.eventId !== "evt-title-new"
            },
        })

        const summary = await runStaleDeltaCleanup({ db, policies: [policy] })

        await expect(db.prepare("SELECT event_id FROM task_events ORDER BY timestamp").all()).resolves.toEqual({
            results: [
                { event_id: "evt-create" },
                { event_id: "evt-title-new" },
                { event_id: "evt-status-old" },
                { event_id: "evt-status-new" },
            ],
        })
        expect(summary).toEqual([{ sourceTable: "task_events", deleted: 1 }])
    })
})
