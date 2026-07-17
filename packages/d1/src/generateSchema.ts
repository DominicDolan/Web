#!/usr/bin/env tsx

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { pathToFileURL } from "node:url"
import { DatabaseSync } from "node:sqlite"
import type { ModelSchema } from "./ModelSchemaBuilder"
import { type TableSchema, type ColumnDef, parseCreateTable } from "./SchemaDiffer"
import { setSchemaContext, clearSchemaContext } from "./SchemaContext"
import {
    type DeltaProjection,
    type LinkProjection,
    getRegisteredDeltaProjections,
    clearDeltaProjectionRegistry,
    getRegisteredLinkProjections,
    clearLinkProjectionRegistry,
} from "./projections"

const GENERATED_SUFFIX = "_generated.sql"

export type GenerateSchemaOptions = {
    /** A model file or directory containing model modules. Defaults to `src/models`. */
    modelsPath?: string
    /** Directory containing existing/generated migrations. Defaults to `migrations`. */
    migrationsDir?: string
}

export type GenerateSchemaResult = {
    status: "written" | "unchanged" | "empty"
    path?: string
    sql?: string
}

function sha256(text: string) {
    return crypto.createHash("sha256").update(text).digest("hex")
}

function walk(dir: string): string[] {
    const out: string[] = []
    if (!fs.existsSync(dir)) return out
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(full))
        else out.push(full)
    }
    return out
}

function listMigrationFiles(migrationsDir: string) {
    if (!fs.existsSync(migrationsDir)) return []
    return fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()
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
 * Extract table schemas from all migration files using a temporary SQLite database
 */
function extractOldSchemas(migrationsDir: string, migrationFiles: string[]): Map<string, TableSchema> {
    const schemas = new Map<string, TableSchema>()
    const db = new DatabaseSync(":memory:")

    // Apply all migration files in order
    for (const file of migrationFiles) {
        const content = fs.readFileSync(path.join(migrationsDir, file), "utf8")
        try {
            // SQLite exec can handle multiple statements
            db.exec(content)
        } catch (e) {
            console.warn(`Warning: Error applying migration ${file}:`, e)
        }
    }

    // Query tables
    const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string, sql: string }[]

    for (const { name: tableName, sql: tableSql } of tables) {
        const columns: ColumnDef[] = []
        const tableInfo = db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[]

        const isAutoIncrement = tableSql.toUpperCase().includes("AUTOINCREMENT")

        for (const col of tableInfo) {
            columns.push({
                name: col.name,
                type: col.type,
                notNull: !!col.notnull,
                primaryKey: !!col.pk,
                autoIncrement: !!col.pk && isAutoIncrement && tableSql.toUpperCase().includes(`"${col.name}"`) // Simple heuristic
            })
        }

        const indexes: TableSchema['indexes'] = []
        const indexList = db.prepare(`PRAGMA index_list("${tableName}")`).all() as any[]
        for (const idx of indexList) {
            // Skip implicit indexes (like those for PRIMARY KEY)
            if (idx.origin === 'pk') continue

            const indexInfo = db.prepare(`PRAGMA index_info("${idx.name}")`).all() as any[]
            indexes.push({
                name: idx.name,
                unique: !!idx.unique,
                columns: indexInfo.map(c => c.name)
            })
        }

        const foreignKeys: TableSchema['foreignKeys'] = []
        const fkList = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as any[]
        for (const fk of fkList) {
            foreignKeys.push({
                column: fk.from,
                references: `${fk.table}(${fk.to})`,
                onDelete: fk.on_delete,
                onUpdate: fk.on_update
            })
        }

        schemas.set(tableName, {
            tableName,
            columns,
            indexes,
            foreignKeys
        })
    }

    return schemas
}

async function loadSchemaModules(modelsPath: string) {
    if (!fs.existsSync(modelsPath)) {
        throw new Error(`Models path does not exist: ${modelsPath}`)
    }

    const stat = fs.statSync(modelsPath)
    const files = (stat.isDirectory() ? walk(modelsPath) : [modelsPath])
        .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
        .filter((f) => !f.endsWith(".d.ts"))

    const loaded: Array<{ file: string; sql: string; tableName: string }> = []

    for (const file of files) {
        const url = pathToFileURL(file).href
        // Use a cache buster to ensure we reload the modules with the new context
        const mod = await import(`${url}?t=${Date.now()}`)

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

function sanitizeIdentifierPart(value: string) {
    return value.replace(/[^a-zA-Z0-9_]/g, "_")
}

function quoteIdentifier(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`
}

type ProjectionMigrationEntry = { label: string; sql: string }

/**
 * Builds migration SQL for registered delta projections: the target table
 * (+ indexes) the first time it's introduced, and the ack column (+ pending
 * work index) on the source delta table the first time it's introduced.
 * Both are skipped once `oldSchemas` (derived from previously-written
 * migration files) shows they already exist, so re-running this generator
 * doesn't keep re-emitting the same statements.
 */
function buildProjectionMigrationEntries(
    projections: ReadonlyArray<DeltaProjection<any>>,
    oldSchemas: Map<string, TableSchema>,
): ProjectionMigrationEntry[] {
    const entries: ProjectionMigrationEntry[] = []

    for (const projection of projections) {
        const statements: string[] = []

        const targetAlreadyExists = oldSchemas.has(projection.target.tableName)
        if (!targetAlreadyExists) {
            statements.push(projection.target.sql.trim())
        }

        const oldSourceSchema = oldSchemas.get(projection.sourceTable)
        const ackColumnAlreadyExists = oldSourceSchema?.columns.some((c) => c.name === projection.ackColumn) ?? false

        if (!ackColumnAlreadyExists) {
            const sourceTable = quoteIdentifier(projection.sourceTable)
            const ackColumn = quoteIdentifier(projection.ackColumn)
            const pendingIndexName = quoteIdentifier(
                `${projection.sourceTable}_${sanitizeIdentifierPart(projection.ackColumn)}_pending_idx`
            )

            statements.push(`ALTER TABLE ${sourceTable} ADD COLUMN ${ackColumn} INTEGER;`)
            statements.push(`CREATE INDEX IF NOT EXISTS ${pendingIndexName} ON ${sourceTable} (${ackColumn}, "timestamp");`)
        }

        if (statements.length === 0) continue

        entries.push({
            label: `Projection: ${projection.name} (${projection.mode}) -> ${projection.target.tableName}`,
            sql: statements.join("\n"),
        })
    }

    return entries
}

function buildLinkProjectionMigrationEntries(
    projections: ReadonlyArray<LinkProjection<any, any>>,
    oldSchemas: Map<string, TableSchema>,
): ProjectionMigrationEntry[] {
    const entries: ProjectionMigrationEntry[] = []

    for (const projection of projections) {
        const statements: string[] = []

        const targetAlreadyExists = oldSchemas.has(projection.target.tableName)
        if (!targetAlreadyExists) {
            statements.push(projection.target.sql.trim())
        }

        const sourceAcks = [
            { sourceTable: projection.sourceTable, ackColumn: projection.ackColumn },
            ...Object.values(projection.references).map((ref) => ({
                sourceTable: ref.sourceTable,
                ackColumn: ref.ackColumn,
            })),
        ]

        for (const { sourceTable, ackColumn } of sourceAcks) {
            const oldSourceSchema = oldSchemas.get(sourceTable)
            const ackColumnAlreadyExists = oldSourceSchema?.columns.some((c) => c.name === ackColumn) ?? false

            if (ackColumnAlreadyExists) continue

            const quotedSourceTable = quoteIdentifier(sourceTable)
            const quotedAckColumn = quoteIdentifier(ackColumn)
            const pendingIndexName = quoteIdentifier(
                `${sourceTable}_${sanitizeIdentifierPart(ackColumn)}_pending_idx`
            )

            statements.push(`ALTER TABLE ${quotedSourceTable} ADD COLUMN ${quotedAckColumn} INTEGER;`)
            statements.push(`CREATE INDEX IF NOT EXISTS ${pendingIndexName} ON ${quotedSourceTable} (${quotedAckColumn}, "timestamp");`)
        }

        if (statements.length === 0) continue

        entries.push({
            label: `Link projection: ${projection.name} -> ${projection.target.tableName}`,
            sql: statements.join("\n"),
        })
    }

    return entries
}

function buildMigrationSql(
    loaded: Array<{ file: string; sql: string }>,
    projectionEntries: ProjectionMigrationEntry[],
    modelsPath: string,
) {
    const header = [
        "-- Generated migration file. Do not edit by hand.",
        `-- Generated at: ${new Date().toISOString()}`,
        `-- Source path: ${path.relative(process.cwd(), modelsPath)}`,
        "",
    ].join("\n")

    const modelBody = loaded
        .map((x) => {
            const rel = path.relative(process.cwd(), x.file)
            return `-- Source: ${rel}\n${x.sql.trim()}`
        })
        .join("\n\n")

    const projectionBody = projectionEntries
        .map((x) => `-- ${x.label}\n${x.sql}`)
        .join("\n\n")

    const sections = [modelBody, projectionBody].filter(Boolean)

    return `${header}\n${sections.join("\n\n")}\n`
}

export async function generateSchema(options: GenerateSchemaOptions = {}): Promise<GenerateSchemaResult> {
    const modelsPath = path.resolve(process.cwd(), options.modelsPath ?? "src/models")
    const migrationsDir = path.resolve(process.cwd(), options.migrationsDir ?? "migrations")

    fs.mkdirSync(migrationsDir, { recursive: true })

    // Get all migrations to extract old schemas
    const migrationFiles = listMigrationFiles(migrationsDir)

    // Extract old schemas and set context
    const oldSchemas = extractOldSchemas(migrationsDir, migrationFiles)
    setSchemaContext({ oldSchemas })
    clearDeltaProjectionRegistry()
    clearLinkProjectionRegistry()

    try {
        const loaded = await loadSchemaModules(modelsPath)

        // Importing model modules above also runs any `defineDeltaProjection(...)` /
        // `defineReadModelProjection(...)` / etc. calls at their top level, which
        // registers projection metadata here.
        const projections = getRegisteredDeltaProjections()
        const linkProjections = getRegisteredLinkProjections()
        const projectionEntries = [
            ...buildProjectionMigrationEntries(projections, oldSchemas),
            ...buildLinkProjectionMigrationEntries(linkProjections, oldSchemas),
        ]

        if (loaded.length === 0 && projectionEntries.length === 0) {
            return { status: "empty" }
        }

        const sql = buildMigrationSql(loaded, projectionEntries, modelsPath)
        const sqlHash = sha256(sql)

        const latestGenerated = latestGeneratedMigration(migrationFiles)
        if (latestGenerated) {
            const latestContents = fs.readFileSync(path.join(migrationsDir, latestGenerated), "utf8")
            if (sha256(latestContents) === sqlHash) {
                return {
                    status: "unchanged",
                    path: path.join(migrationsDir, latestGenerated),
                    sql,
                }
            }
        }

        const n = nextMigrationNumber(migrationFiles)
        const filename = `${String(n).padStart(4, "0")}_generated.sql`
        const outPath = path.join(migrationsDir, filename)
        fs.writeFileSync(outPath, sql, "utf8")

        return { status: "written", path: outPath, sql }
    } finally {
        clearSchemaContext()
    }
}

async function main() {
    const args = process.argv.slice(2)
    const modelsPath = args[0]
    const migrationsDir = args[1]
    const result = await generateSchema({ modelsPath, migrationsDir })

    if (result.status === "empty") {
        console.log(`No schema modules or projections found in ${path.resolve(process.cwd(), modelsPath ?? "src/models")}`)
        return
    }

    if (result.status === "unchanged") {
        console.log(`No changes. Latest generated migration (${path.basename(result.path!)}) already matches.`)
        return
    }

    if (result.path) {
        console.log(`Wrote ${path.relative(process.cwd(), result.path)}`)
    }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    main().catch((e) => {
        console.error(e)
        process.exit(1)
    })
}
