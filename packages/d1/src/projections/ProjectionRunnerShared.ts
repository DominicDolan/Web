import { Model } from "@web/schema";
import { PersistedModelDelta, quoteIdentifier } from "./SchemaRuntimeContext";

/**
 * Minimal interface the runners need from a database handle. Both a real
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

export type SourceRow = {
    event_id: string
    id: string
    path: string
    value: unknown
    timestamp: number
}

export function parseStoredValue(raw: unknown) {
    if (raw === null || raw === undefined) return undefined
    if (typeof raw !== "string") return raw

    try {
        return JSON.parse(raw)
    } catch {
        return raw
    }
}

export function rowToDelta<M extends Model>(row: SourceRow): PersistedModelDelta<M> {
    return {
        eventId: row.event_id,
        id: row.id,
        path: row.path as PersistedModelDelta<M>["path"],
        value: parseStoredValue(row.value),
        timestamp: row.timestamp,
    }
}

export async function tableHasColumn(db: ProjectionRunnerDb, tableName: string, columnName: string) {
    const { results } = await db.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all<{ name: string }>()
    return (results ?? []).some((column) => column.name === columnName)
}

/** Idempotently creates a projection target table (and its indexes) from `CREATE ...;` SQL. */
export async function ensureTargetTable(db: ProjectionRunnerDb, sql: string) {
    const statements = sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean)

    for (const statement of statements) {
        await db.prepare(statement).run()
    }
}

/** Idempotently adds an ack column to a source delta table. */
export async function ensureAckColumn(db: ProjectionRunnerDb, sourceTable: string, ackColumn: string) {
    const hasColumn = await tableHasColumn(db, sourceTable, ackColumn)
    if (hasColumn) return

    await db.prepare(
        `ALTER TABLE ${quoteIdentifier(sourceTable)} ADD COLUMN ${quoteIdentifier(ackColumn)} INTEGER`,
    ).run()
}

export async function fetchPendingRows(
    db: ProjectionRunnerDb,
    sourceTable: string,
    ackColumn: string,
    limit: number,
): Promise<SourceRow[]> {
    const sql = `
        SELECT event_id, id, path, value, timestamp
        FROM ${quoteIdentifier(sourceTable)}
        WHERE ${quoteIdentifier(ackColumn)} IS NULL
        ORDER BY timestamp
        LIMIT ?
    `

    const { results } = await db.prepare(sql).bind(limit).all<SourceRow>()
    return results ?? []
}

export async function fetchDeltasForIds(
    db: ProjectionRunnerDb,
    sourceTable: string,
    ids: string[],
): Promise<SourceRow[]> {
    if (ids.length === 0) return []

    const placeholders = ids.map(() => "?").join(", ")
    const sql = `
        SELECT event_id, id, path, value, timestamp
        FROM ${quoteIdentifier(sourceTable)}
        WHERE id IN (${placeholders})
        ORDER BY timestamp
    `

    const { results } = await db.prepare(sql).bind(...ids).all<SourceRow>()
    return results ?? []
}

export async function ackEventIds(
    db: ProjectionRunnerDb,
    sourceTable: string,
    ackColumn: string,
    eventIds: string[],
) {
    if (eventIds.length === 0) return

    const placeholders = eventIds.map(() => "?").join(", ")
    const sql = `
        UPDATE ${quoteIdentifier(sourceTable)}
        SET ${quoteIdentifier(ackColumn)} = ?
        WHERE event_id IN (${placeholders})
    `

    await db.prepare(sql).bind(Date.now(), ...eventIds).run()
}

export function groupByModelId(rows: SourceRow[]) {
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

