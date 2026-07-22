#!/usr/bin/env tsx

import { runDeltaProjectionsLocal } from "./projections/index.ts"

function optionValue(args: string[], name: string) {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
}

async function main() {
    const args = process.argv.slice(2)
    const modelsDir = args.find((arg) => !arg.startsWith("-"))

    const summary = await runDeltaProjectionsLocal({
        modelsDir,
        configPath: optionValue(args, "--config"),
        binding: optionValue(args, "--binding"),
    })

    for (const projection of summary) {
        console.log(`${projection.name}: processed ${projection.processed} row(s) from ${projection.sourceTable}`)
    }
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
