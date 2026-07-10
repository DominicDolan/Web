import { Model } from "@web/schema";
import { createModel } from "@web/solid-delta";
import { DeltaProjection, DeltaProjectionContext, ModelProjectionContext } from "./DeltaProjection";
import { PersistedModelDelta, quoteIdentifier } from "./SchemaRuntimeContext";

/**
 * Minimal interface the runner needs from a database handle. Both a real
 * `D1Database` and the local `node:sqlite`-backed adapter satisfy this.
 */
export type ProjectionRunnerStatement = {
    bind(...args: unknown[]): ProjectionRunnerStatement
    run(): Promise<unknown>
    all<T = any>(): Promise<{ results: T[] }>
}

export type ProjectionRunnerDb = {
    prepare(sql: string): ProjectionRunnerStatement
}

export type RunDeltaProjectionsOptions = {
    db: ProjectionRunnerDb
    projections: ReadonlyArray<DeltaProjection<any>>
    /** Max rows fetched per query round. Defaults to 200. */
    batchSize?: number
}

export type RunDeltaProjectionsSummary = {
    name: string
    sourceTable: string
    processed: number
}

type SourceRow = {
    event_id: string
    id: string
    path: string
    value: unknown
    timestamp: number
}

function parseStoredValue(raw: unknown) {
    if (raw === null || raw === undefined) return undefined
    if (typeof raw !== "string") return raw

    try {
        return JSON.parse(raw)
    } catch {
        return raw
    }
}

function rowToDelta<M extends Model>(row: SourceRow): PersistedModelDelta<M> {
    return {
        eventId: row.event_id,
        id: row.id,
        path: row.path as PersistedModelDelta<M>["path"],
        value: parseStoredValue(row.value),
        timestamp: row.timestamp,
    }
}

async function tableHasColumn(db: ProjectionRunnerDb, tableName: string, columnName: string) {
    const { results } = await db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all<{ name: string }>()
    return (results ?? []).some((column) => column.name === columnName)
}

/** Idempotently creates the projection's target table (and its indexes). */
async function ensureTargetTable(db: ProjectionRunnerDb, projection: DeltaProjection<any>) {
    const statements = projection.target.sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean)

    for (const statement of statements) {
        await db.prepare(statement).run()
    }
}

/** Idempotently adds the projection's ack column to the source delta table. */
async function ensureAckColumn(db: ProjectionRunnerDb, projection: DeltaProjection<any>) {
    const hasColumn = await tableHasColumn(db, projection.sourceTable, projection.ackColumn)
    if (hasColumn) return

    await db.prepare(
        `ALTER TABLE ${quoteIdentifier(projection.sourceTable)} ADD COLUMN ${quoteIdentifier(projection.ackColumn)} INTEGER`,
    ).run()
}

async function fetchPendingRows(db: ProjectionRunnerDb, projection: DeltaProjection<any>, limit: number): Promise<SourceRow[]> {
    const sql = `
        SELECT event_id, id, path, value, timestamp
        FROM ${quoteIdentifier(projection.sourceTable)}
        WHERE ${quoteIdentifier(projection.ackColumn)} IS NULL
        ORDER BY timestamp
        LIMIT ?
    `

    const { results } = await db.prepare(sql).bind(limit).all<SourceRow>()
    return results ?? []
}

async function fetchDeltasForIds(db: ProjectionRunnerDb, projection: DeltaProjection<any>, ids: string[]): Promise<SourceRow[]> {
    if (ids.length === 0) return []

    const placeholders = ids.map(() => "?").join(", ")
    const sql = `
        SELECT event_id, id, path, value, timestamp
        FROM ${quoteIdentifier(projection.sourceTable)}
        WHERE id IN (${placeholders})
        ORDER BY timestamp
    `

    const { results } = await db.prepare(sql).bind(...ids).all<SourceRow>()
    return results ?? []
}

async function ackEventIds(db: ProjectionRunnerDb, projection: DeltaProjection<any>, eventIds: string[]) {
    if (eventIds.length === 0) return

    const placeholders = eventIds.map(() => "?").join(", ")
    const sql = `
        UPDATE ${quoteIdentifier(projection.sourceTable)}
        SET ${quoteIdentifier(projection.ackColumn)} = ?
        WHERE event_id IN (${placeholders})
    `

    await db.prepare(sql).bind(Date.now(), ...eventIds).run()
}

function groupByModelId(rows: SourceRow[]) {
    const byId = new Map<string, PersistedModelDelta<any>[]>()

    for (const row of rows) {
        const delta = rowToDelta(row)
        const list = byId.get(delta.id)
        if (list) {
            list.push(delta)
        } else {
            byId.set(delta.id, [delta])
        }
    }

    return byId
}

async function runModelModeProjection(db: ProjectionRunnerDb, projection: DeltaProjection<any>, pendingRows: SourceRow[]) {
    const newDeltasByModelId = groupByModelId(pendingRows)
    const ids = [...newDeltasByModelId.keys()]

    const allRows = await fetchDeltasForIds(db, projection, ids)
    const allDeltasByModelId = groupByModelId(allRows)

    const table = (projection.metadata as any)?.table

    for (const id of ids) {
        const deltas = allDeltasByModelId.get(id) ?? []
        const newDeltas = newDeltasByModelId.get(id) ?? []
        const model = createModel(deltas as any)

        const ctx: ModelProjectionContext<any> = {
            db,
            id,
            model,
            deltas,
            newDeltas,
            schema: projection.schema,
            metadata: projection.metadata,
            table,
            sourceTable: projection.sourceTable,
        }

        await projection.project!(ctx)
    }

    await ackEventIds(db, projection, pendingRows.map((row) => row.event_id))
}

async function runDeltaModeProjection(db: ProjectionRunnerDb, projection: DeltaProjection<any>, pendingRows: SourceRow[]) {
    const table = (projection.metadata as any)?.table

    for (const row of pendingRows) {
        const delta = rowToDelta(row)

        const ctx: DeltaProjectionContext<any> = {
            db,
            delta,
            schema: projection.schema,
            metadata: projection.metadata,
            table,
            sourceTable: projection.sourceTable,
        }

        await projection.projectDelta!(ctx)
    }

    await ackEventIds(db, projection, pendingRows.map((row) => row.event_id))
}

/**
 * Runs every given delta projection to completion: ensures target tables and
 * ack columns exist, then repeatedly processes pending source deltas in
 * batches until none remain. Safe to call repeatedly (e.g. on a cron
 * schedule) - projection writes are idempotent and acking is by `event_id`.
 */
export async function runDeltaProjections(options: RunDeltaProjectionsOptions): Promise<RunDeltaProjectionsSummary[]> {
    const { db, projections, batchSize = 200 } = options
    const summary: RunDeltaProjectionsSummary[] = []

    for (const projection of projections) {
        await ensureTargetTable(db, projection)
        await ensureAckColumn(db, projection)

        let processed = 0

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const pendingRows = await fetchPendingRows(db, projection, batchSize)
            if (pendingRows.length === 0) break

            if (projection.mode === "model") {
                await runModelModeProjection(db, projection, pendingRows)
            } else {
                await runDeltaModeProjection(db, projection, pendingRows)
            }

            processed += pendingRows.length
            if (pendingRows.length < batchSize) break
        }

        summary.push({ name: projection.name, sourceTable: projection.sourceTable, processed })
    }

    return summary
}


