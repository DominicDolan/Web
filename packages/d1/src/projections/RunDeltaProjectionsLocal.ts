import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { getPlatformProxy } from "wrangler"
import { clearDeltaProjectionRegistry, getRegisteredDeltaProjections } from "./DeltaProjection"
import { runDeltaProjections } from "./RunDeltaProjections"

export type RunDeltaProjectionsLocalOptions = {
    /** Directory containing model modules that declare delta projections. */
    modelsDir?: string
    /** Path to the Wrangler configuration for the local D1 binding. */
    configPath?: string
    /** D1 binding name in the Wrangler configuration. Defaults to `DB`. */
    binding?: string
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

async function loadProjectionModules(modelsDir: string) {
    if (!fs.existsSync(modelsDir)) {
        throw new Error(`Models directory does not exist: ${modelsDir}`)
    }

    clearDeltaProjectionRegistry()

    for (const file of walk(modelsDir).sort()) {
        await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
    }
}

/**
 * Runs registered projections against Wrangler's local D1 database.
 *
 * This is intentionally separate from `runDeltaProjections`, whose explicit
 * database argument keeps it usable from a deployed Cloudflare Worker.
 */
export async function runDeltaProjectionsLocal(options: RunDeltaProjectionsLocalOptions = {}) {
    const modelsDir = path.resolve(process.cwd(), options.modelsDir ?? "src/models")
    const configPath = path.resolve(process.cwd(), options.configPath ?? "./wrangler.jsonc")
    const binding = options.binding ?? "DB"

    await loadProjectionModules(modelsDir)

    const proxy = await getPlatformProxy({ configPath })
    const db = proxy.env[binding] as unknown

    if (!db || typeof (db as { prepare?: unknown }).prepare !== "function") {
        throw new Error(`Wrangler binding "${binding}" is not a D1 database in ${configPath}.`)
    }

    return runDeltaProjections({
        db: db as Parameters<typeof runDeltaProjections>[0]["db"],
        projections: getRegisteredDeltaProjections(),
        batchSize: options.batchSize,
    })
}
