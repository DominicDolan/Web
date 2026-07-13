import { getPlatformProxy } from "wrangler"
import type { StaleDeltaPolicy } from "./StaleDeltaPolicy"
import { runStaleDeltaCleanup } from "./RunStaleDeltaCleanup"

export type RunStaleDeltaCleanupLocalOptions = {
    /** Path to the Wrangler configuration for the local D1 binding. */
    configPath?: string
    /** D1 binding name in the Wrangler configuration. Defaults to `DB`. */
    binding?: string
    policies?: ReadonlyArray<StaleDeltaPolicy<any>>
    batchSize?: number
}

/**
 * Runs stale-delta cleanup against Wrangler's local D1 database.
 *
 * Policies will be supplied by the generated runtime manifest once stale
 * policy manifest generation is implemented.
 */
export async function runStaleDeltaCleanupLocal(options: RunStaleDeltaCleanupLocalOptions = {}) {
    const configPath = options.configPath ?? "./wrangler.jsonc"
    const binding = options.binding ?? "DB"
    const proxy = await getPlatformProxy({ configPath })
    const db = proxy.env[binding] as unknown

    if (!db || typeof (db as { prepare?: unknown }).prepare !== "function") {
        throw new Error(`Wrangler binding "${binding}" is not a D1 database in ${configPath}.`)
    }

    return runStaleDeltaCleanup({
        db: db as Parameters<typeof runStaleDeltaCleanup>[0]["db"],
        policies: options.policies ?? [],
        batchSize: options.batchSize,
    })
}
