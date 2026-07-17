import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { getPlatformProxy } from "wrangler"
import { clearStaleDeltaPolicyRegistry, getRegisteredStaleDeltaPolicies } from "./StaleDeltaPolicy"
import { runStaleDeltaCleanup } from "./RunStaleDeltaCleanup"

export type RunStaleDeltaCleanupLocalOptions = {
    /** Path to the Wrangler configuration for the local D1 binding. */
    configPath?: string
    /** D1 binding name in the Wrangler configuration. Defaults to `DB`. */
    binding?: string
    /** Directory containing model modules whose delta tables should be cleaned. */
    modelsDir?: string
    batchSize?: number
}

function walk(dir: string): string[] {
    const files: string[] = []

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name)
        if (entry.isDirectory()) files.push(...walk(file))
        else if ((file.endsWith(".ts") || file.endsWith(".tsx")) && !file.endsWith(".d.ts")) files.push(file)
    }

    return files
}

async function loadModels(modelsDir: string): Promise<string[]> {
    if (!fs.existsSync(modelsDir)) {
        throw new Error(`Models directory does not exist: ${modelsDir}`)
    }

    clearStaleDeltaPolicyRegistry()
    const sourceTables = new Set<string>()

    for (const file of walk(modelsDir).sort()) {
        const module = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)

        for (const value of Object.values(module)) {
            if (!value || typeof value !== "object" || typeof (value as { meta?: unknown }).meta !== "function") continue

            const table = ((value as { meta(): unknown }).meta() as { table?: { tableName?: unknown } } | undefined)?.table
            if (typeof table?.tableName === "string") sourceTables.add(table.tableName)
        }
    }

    return [...sourceTables]
}

/**
 * Runs stale-delta cleanup against Wrangler's local D1 database.
 *
 * It imports the model modules to discover every delta schema, so tables with
 * no stale-policy guards still receive conservative base cleanup.
 */
export async function runStaleDeltaCleanupLocal(options: RunStaleDeltaCleanupLocalOptions = {}) {
    const modelsDir = path.resolve(process.cwd(), options.modelsDir ?? "src/models")
    const configPath = path.resolve(process.cwd(), options.configPath ?? "./wrangler.jsonc")
    const binding = options.binding ?? "DB"
    const sourceTables = await loadModels(modelsDir)
    const policies = getRegisteredStaleDeltaPolicies()
    const proxy = await getPlatformProxy({ configPath })
    const db = proxy.env[binding] as unknown

    if (!db || typeof (db as { prepare?: unknown }).prepare !== "function") {
        throw new Error(`Wrangler binding "${binding}" is not a D1 database in ${configPath}.`)
    }

    return runStaleDeltaCleanup({
        db: db as Parameters<typeof runStaleDeltaCleanup>[0]["db"],
        policies,
        sourceTables,
        batchSize: options.batchSize,
    })
}
