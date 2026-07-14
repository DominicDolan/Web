#!/usr/bin/env tsx

import { runStaleDeltaCleanupLocal } from "./projections"

function optionValue(args: string[], name: string) {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
}

function positionalValue(args: string[]) {
    for (let index = 0; index < args.length; index++) {
        if (args[index].startsWith("-")) {
            index++
            continue
        }

        return args[index]
    }
}

async function main() {
    console.log("running stale delta cleanup...")
    const args = process.argv.slice(2)
    const modelsDir = positionalValue(args)
    const summary = await runStaleDeltaCleanupLocal({
        modelsDir,
        configPath: optionValue(args, "--config"),
        binding: optionValue(args, "--binding"),
    })

    console.log("summary:", summary[0])

    for (const table of summary) {
        console.log(`${table.sourceTable}: deleted ${table.deleted} stale row(s)`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
