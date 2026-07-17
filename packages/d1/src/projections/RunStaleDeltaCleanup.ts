import type { Model } from "@web/schema"
import type { PersistedModelDelta } from "./SchemaRuntimeContext"
import { quoteIdentifier } from "./SchemaRuntimeContext"
import type { ProjectionRunnerDb } from "./ProjectionRunnerShared"
import type { StaleDeltaPolicy, StaleDeltaSqlCondition } from "./StaleDeltaPolicy"

export type RunStaleDeltaCleanupOptions = {
    db: ProjectionRunnerDb
    policies: ReadonlyArray<StaleDeltaPolicy<any>>
    /** Source delta tables to clean even when they have no stale-policy guards. */
    sourceTables?: ReadonlyArray<string>
    /** Maximum candidate rows to process per cleanup pass. Defaults to 200. */
    batchSize?: number
}

export type RunStaleDeltaCleanupSummary = {
    sourceTable: string
    deleted: number
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

function normalizeSqlCondition(condition: StaleDeltaSqlCondition | string): StaleDeltaSqlCondition {
    return typeof condition === "string"
        ? { sql: condition, bind: [] }
        : condition
}

async function fetchCandidates(
    db: ProjectionRunnerDb,
    sourceTable: string,
    policies: ReadonlyArray<StaleDeltaPolicy<any>>,
    batchSize: number,
): Promise<SourceRow[]> {
    const sqlConditions: StaleDeltaSqlCondition[] = []

    for (const policy of policies) {
        if (!policy.where) continue

        sqlConditions.push(normalizeSqlCondition(policy.where({
            schema: policy.schema,
            metadata: policy.metadata,
            table: (policy.metadata as any)?.table,
            sourceTable,
            sourceAlias: "old",
        })))
    }

    const guardSql = sqlConditions
        .map((condition) => `AND (${condition.sql})`)
        .join("\n")
    const guardBindings = sqlConditions.flatMap((condition) => condition.bind)

    const sql = `
        SELECT old.event_id, old.id, old.path, old.value, old.timestamp
        FROM ${quoteIdentifier(sourceTable)} AS old
        WHERE old.path != ''
          AND old.path NOT LIKE '%$array%'
          AND EXISTS (
              SELECT 1
              FROM ${quoteIdentifier(sourceTable)} AS newer
              WHERE newer.id = old.id
                AND newer.path = old.path
                AND newer.timestamp > old.timestamp
          )
          ${guardSql}
        LIMIT ?
    `

    const { results } = await db.prepare(sql).bind(...guardBindings, batchSize).all<SourceRow>()
    return results ?? []
}

async function deleteEventIds(db: ProjectionRunnerDb, sourceTable: string, eventIds: string[]) {
    if (eventIds.length === 0) return

    const placeholders = eventIds.map(() => "?").join(", ")
    await db.prepare(`
        DELETE FROM ${quoteIdentifier(sourceTable)}
        WHERE event_id IN (${placeholders})
    `).bind(...eventIds).run()
}

/**
 * Runs one conservative stale-delta cleanup pass for each source table in the
 * supplied policies. A candidate must be a superseded, non-array field delta,
 * pass every SQL guard, and pass every JavaScript guard before it is deleted.
 */
export async function runStaleDeltaCleanup(
    options: RunStaleDeltaCleanupOptions,
): Promise<RunStaleDeltaCleanupSummary[]> {
    const { db, policies, sourceTables = [], batchSize = 200 } = options
    const policiesBySourceTable = new Map<string, StaleDeltaPolicy<any>[]>()

    for (const sourceTable of sourceTables) {
        policiesBySourceTable.set(sourceTable, [])
    }

    for (const policy of policies) {
        const tablePolicies = policiesBySourceTable.get(policy.sourceTable)
        if (tablePolicies) {
            tablePolicies.push(policy)
        } else {
            policiesBySourceTable.set(policy.sourceTable, [policy])
        }
    }

    const summaries: RunStaleDeltaCleanupSummary[] = []

    for (const [sourceTable, tablePolicies] of policiesBySourceTable) {
        const candidates = await fetchCandidates(db, sourceTable, tablePolicies, batchSize)
        const eventIdsToDelete: string[] = []

        for (const row of candidates) {
            const delta = rowToDelta(row)
            let allowed = true

            for (const policy of tablePolicies) {
                if (!policy.filter) continue

                const result = await policy.filter({
                    delta,
                    schema: policy.schema,
                    metadata: policy.metadata,
                    table: (policy.metadata as any)?.table,
                    sourceTable,
                })

                if (!result) {
                    allowed = false
                    break
                }
            }

            if (allowed) eventIdsToDelete.push(row.event_id)
        }

        await deleteEventIds(db, sourceTable, eventIdsToDelete)
        summaries.push({ sourceTable, deleted: eventIdsToDelete.length })
    }

    return summaries
}
