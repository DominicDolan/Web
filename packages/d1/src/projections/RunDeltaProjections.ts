import { createModel } from "@web/solid-delta";
import { DeltaProjection, DeltaProjectionContext, ModelProjectionContext } from "./DeltaProjection";
import {
    ProjectionRunnerDb,
    SourceRow,
    ackEventIds,
    ensureAckColumn,
    ensureTargetTable,
    fetchDeltasForIds,
    fetchPendingRows,
    groupByModelId,
    rowToDelta,
} from "./ProjectionRunnerShared";

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


async function runModelModeProjection(db: ProjectionRunnerDb, projection: DeltaProjection<any>, pendingRows: SourceRow[]) {
    const newDeltasByModelId = groupByModelId(pendingRows)
    const ids = [...newDeltasByModelId.keys()]

    const allRows = await fetchDeltasForIds(db, projection.sourceTable, ids)
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

    await ackEventIds(db, projection.sourceTable, projection.ackColumn, pendingRows.map((row) => row.event_id))
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

    await ackEventIds(db, projection.sourceTable, projection.ackColumn, pendingRows.map((row) => row.event_id))
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
        await ensureTargetTable(db, projection.target.sql)
        await ensureAckColumn(db, projection.sourceTable, projection.ackColumn)

        let processed = 0

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const pendingRows = await fetchPendingRows(db, projection.sourceTable, projection.ackColumn, batchSize)
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


