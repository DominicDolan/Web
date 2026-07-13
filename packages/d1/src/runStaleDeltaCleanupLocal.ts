#!/usr/bin/env tsx

import { runStaleDeltaCleanupLocal } from "./projections/RunStaleDeltaCleanupLocal"

function optionValue(args: string[], name: string) {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
}

async function main() {
    const args = process.argv.slice(2)
    const summary = await runStaleDeltaCleanupLocal({
        configPath: optionValue(args, "--config"),
        binding: optionValue(args, "--binding"),
    })

    for (const table of summary) {
        console.log(`${table.sourceTable}: deleted ${table.deleted} stale row(s)`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
