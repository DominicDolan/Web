import type { ProjectionRunnerDb } from "./RunDeltaProjections"
import type { StaleDeltaPolicy } from "./StaleDeltaPolicy"

export type RunStaleDeltaCleanupOptions = {
    db: ProjectionRunnerDb
    policies: ReadonlyArray<StaleDeltaPolicy<any>>
    /** Maximum candidate rows to process per cleanup pass. Defaults to 200. */
    batchSize?: number
}

export type RunStaleDeltaCleanupSummary = {
    sourceTable: string
    deleted: number
}

/**
 * Runs stale-delta cleanup for the supplied policies.
 *
 * The cleanup algorithm has not been implemented yet. This placeholder keeps
 * the public API and local/Worker wiring ready for that implementation.
 */
export async function runStaleDeltaCleanup(
    _options: RunStaleDeltaCleanupOptions,
): Promise<RunStaleDeltaCleanupSummary[]> {
    return []
}
