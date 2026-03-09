#!/usr/bin/env tsx

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { pathToFileURL } from "node:url"
import type { ModelSchema } from "./ModelSchemaBuilder"
import { parseCreateTable } from "./SchemaDiffer"
import { setSchemaContext, clearSchemaContext } from "./SchemaContext"

// Accept models and migrations directories as command-line arguments
const args = process.argv.slice(2)
const MODELS_DIR = args[0] ? path.resolve(process.cwd(), args[0]) : path.resolve(process.cwd(), "src/models")
const MIGRATIONS_DIR = args[1] ? path.resolve(process.cwd(), args[1]) : path.resolve(process.cwd(), "migrations")
const GENERATED_SUFFIX = "_generated.sql"

function sha256(text: string) {
    return crypto.createHash("sha256").update(text).digest("hex")
}

function walk(dir: string): string[] {
    const out: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(full))
        else out.push(full)
    }
    return out
}

function listMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) return []
    return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
}

function nextMigrationNumber(files: string[]) {
    let max = 0
    for (const f of files) {
        const m = f.match(/^(\d+)_/)
        if (!m) continue
        max = Math.max(max, Number(m[1]))
    }
    return max + 1
}

function latestGeneratedMigration(files: string[]) {
    const generated = files.filter((f) => f.endsWith(GENERATED_SUFFIX)).sort()
    return generated.length ? generated[generated.length - 1] : null
}

/**
 * Extract table schemas from the latest migration file
 */
function extractOldSchemas(latestMigrationPath: string | null): Map<string, string> {
    const schemas = new Map<string, string>()

    if (!latestMigrationPath) return schemas

    const content = fs.readFileSync(latestMigrationPath, "utf8")
    const lines = content.split("\n")

    let currentTableSql = ""
    let inTable = false

    for (const line of lines) {
        // Start of a new table or DROP statement
        if (line.match(/^(DROP TABLE|CREATE TABLE)/i)) {
            inTable = true
            currentTableSql = line + "\n"
        } else if (inTable) {
            currentTableSql += line + "\n"

            // End of CREATE TABLE or CREATE INDEX
            if (line.trim().endsWith(";")) {
                const parsed = parseCreateTable(currentTableSql)
                if (parsed) {
                    // Store by table name
                    if (!schemas.has(parsed.tableName)) {
                        schemas.set(parsed.tableName, currentTableSql)
                    } else {
                        // Append indexes to existing table schema
                        schemas.set(parsed.tableName, schemas.get(parsed.tableName)! + currentTableSql)
                    }
                }
                inTable = false
                currentTableSql = ""
            }
        }
    }

    return schemas
}

async function loadSchemaModulesFromDir(dir: string, oldSchemas: Map<string, string>) {
    if (!fs.existsSync(dir)) {
        throw new Error(`Models directory does not exist: ${dir}`)
    }

    const files = walk(dir)
        .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
        .filter((f) => !f.endsWith(".d.ts"))

    const loaded: Array<{ file: string; sql: string; tableName: string }> = []

    for (const file of files) {
        const url = pathToFileURL(file).href
        const mod = await import(url)

        // Look for exported schemas (variables ending with "Schema")
        for (const [exportName, exportValue] of Object.entries(mod)) {
            const schema = exportValue as any
            if (!schema || typeof schema !== "object") continue

            // Check if the schema has a meta() method
            if (typeof schema.meta !== "function") continue

            // Get metadata by calling .meta()
            const metadata = schema.meta()
            if (!metadata?.table) continue

            const tableSchema = metadata.table as ModelSchema<any>
            if (!tableSchema.sql) {
                console.warn(`Schema ${exportName} in ${path.relative(process.cwd(), file)} has metadata but no SQL`)
                continue
            }

            loaded.push({
                file,
                sql: tableSchema.sql,
                tableName: tableSchema.tableName,
            })
        }
    }

    // stable order so output is deterministic
    loaded.sort((a, b) => a.file.localeCompare(b.file))
    return loaded
}

function buildMigrationSql(loaded: Array<{ file: string; sql: string }>) {
    const header = [
        "-- Generated migration file. Do not edit by hand.",
        `-- Generated at: ${new Date().toISOString()}`,
        `-- Source directory: ${path.relative(process.cwd(), MODELS_DIR)}`,
        "",
    ].join("\n")

    const body = loaded
        .map((x) => {
            const rel = path.relative(process.cwd(), x.file)
            return `-- Source: ${rel}\n${x.sql.trim()}`
        })
        .join("\n\n")

    return `${header}\n${body}\n`
}

async function main() {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })

    // Get the latest migration to extract old schemas
    const migrationFiles = listMigrationFiles()
    const latestGenerated = latestGeneratedMigration(migrationFiles)
    const latestMigrationPath = latestGenerated ? path.join(MIGRATIONS_DIR, latestGenerated) : null

    // Extract old schemas and set context
    const oldSchemas = extractOldSchemas(latestMigrationPath)
    setSchemaContext({ oldSchemas })

    try {
        // Clear module cache to force re-import with new context
        const loaded = await loadSchemaModulesFromDir(MODELS_DIR, oldSchemas)
        if (loaded.length === 0) {
            console.log(`No schema modules found in ${MODELS_DIR}`)
            return
        }

        const sql = buildMigrationSql(loaded)
        const sqlHash = sha256(sql)

        if (latestGenerated) {
            const latestContents = fs.readFileSync(path.join(MIGRATIONS_DIR, latestGenerated), "utf8")
            if (sha256(latestContents) === sqlHash) {
                console.log(`No changes. Latest generated migration (${latestGenerated}) already matches.`)
                return
            }
        }

        const n = nextMigrationNumber(migrationFiles)
        const filename = `${String(n).padStart(4, "0")}_generated.sql`
        const outPath = path.join(MIGRATIONS_DIR, filename)
        fs.writeFileSync(outPath, sql, "utf8")

        console.log(`Wrote ${path.relative(process.cwd(), outPath)}`)
    } finally {
        clearSchemaContext()
    }
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
