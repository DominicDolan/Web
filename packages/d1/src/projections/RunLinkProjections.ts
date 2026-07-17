import { createModel } from "@web/solid-delta";
import { LinkProjection } from "./LinkProjection";
import {
    ProjectionRunnerDb,
    ackEventIds,
    ensureAckColumn,
    ensureTargetTable,
    fetchDeltasForIds,
    fetchPendingRows,
    rowToDelta,
} from "./ProjectionRunnerShared";

export type RunLinkProjectionsOptions = {
    db: ProjectionRunnerDb
    projections: ReadonlyArray<LinkProjection<any, any>>
    /** Max rows fetched per query round. Defaults to 200. */
    batchSize?: number
}

export type RunLinkProjectionsSummary = {
    name: string
    sourceTable: string
    /** Number of pending primary-source deltas processed. */
    processedPrimary: number
    /** Number of pending reference-source deltas processed (across all references). */
    processedReferences: number
}

/** Rebuilds the current model for a single id from a source delta table, or `undefined` if it has no deltas. */
async function loadModel(db: ProjectionRunnerDb, sourceTable: string, id: string) {
    const rows = await fetchDeltasForIds(db, sourceTable, [id])
    if (rows.length === 0) return undefined

    const deltas = rows.map((row) => rowToDelta(row))
    return createModel(deltas as any)
}

/** Rebuilds the primary model + every referenced model, then calls the projection's `project(...)`. */
async function projectPrimaryId(db: ProjectionRunnerDb, projection: LinkProjection<any, any>, id: string) {
    const model = await loadModel(db, projection.sourceTable, id)

    const refs: Record<string, unknown> = {}
    for (const [name, ref] of Object.entries(projection.references)) {
        const refId = model ? ref.resolveId(model) : undefined
        refs[name] = refId ? await loadModel(db, ref.sourceTable, refId) : undefined
    }

    await projection.project({
        db,
        id,
        model,
        refs: refs as any,
        schema: projection.schema,
        metadata: projection.metadata,
        table: (projection.metadata as any)?.table,
        sourceTable: projection.sourceTable,
    })
}

/**
 * Runs every given link projection to completion:
 *
 * 1. Ensures the target table exists and every source table (primary +
 *    references) has its ack column.
 * 2. Processes pending deltas on the *primary* source: for each affected
 *    model id, rebuilds the primary model and every referenced model, then
 *    calls `project(...)`.
 * 3. Processes pending deltas on each *referenced* source: for each affected
 *    foreign id, looks up dependent primary ids via `findDependents(...)`
 *    (typically a query against the projection's own target table) and
 *    re-runs `project(...)` for each of them, so changes on the referenced
 *    side (e.g. a customer's name changing) propagate into the link table.
 *
 * Safe to call repeatedly - projection writes should be idempotent and
 * acking is by `event_id`, same as `runDeltaProjections(...)`.
 */
export async function runLinkProjections(options: RunLinkProjectionsOptions): Promise<RunLinkProjectionsSummary[]> {
    const { db, projections, batchSize = 200 } = options
    const summary: RunLinkProjectionsSummary[] = []

    for (const projection of projections) {
        await ensureTargetTable(db, projection.target.sql)
        await ensureAckColumn(db, projection.sourceTable, projection.ackColumn)

        for (const ref of Object.values(projection.references)) {
            await ensureAckColumn(db, ref.sourceTable, ref.ackColumn)
        }

        let processedPrimary = 0
        let processedReferences = 0

        // 1. Primary source changed -> reproject those primary rows.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const pendingRows = await fetchPendingRows(db, projection.sourceTable, projection.ackColumn, batchSize)
            if (pendingRows.length === 0) break

            const ids = [...new Set(pendingRows.map((row) => row.id))]
            for (const id of ids) {
                await projectPrimaryId(db, projection, id)
            }

            await ackEventIds(db, projection.sourceTable, projection.ackColumn, pendingRows.map((row) => row.event_id))

            processedPrimary += pendingRows.length
            if (pendingRows.length < batchSize) break
        }

        // 2. Referenced source changed -> find dependent primary rows and reproject them.
        for (const ref of Object.values(projection.references)) {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const pendingRows = await fetchPendingRows(db, ref.sourceTable, ref.ackColumn, batchSize)
                if (pendingRows.length === 0) break

                const refIds = [...new Set(pendingRows.map((row) => row.id))]

                for (const refId of refIds) {
                    const { results } = await ref.findDependents({ db, id: refId })
                    for (const dependent of results ?? []) {
                        await projectPrimaryId(db, projection, dependent.id)
                    }
                }

                await ackEventIds(db, ref.sourceTable, ref.ackColumn, pendingRows.map((row) => row.event_id))

                processedReferences += pendingRows.length
                if (pendingRows.length < batchSize) break
            }
        }

        summary.push({
            name: projection.name,
            sourceTable: projection.sourceTable,
            processedPrimary,
            processedReferences,
        })
    }

    return summary
}

