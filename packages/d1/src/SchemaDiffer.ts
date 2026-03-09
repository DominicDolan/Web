/**
 * Utilities for diffing SQL schemas and generating ALTER TABLE statements.
 *
 * Note: SQLite has limited ALTER TABLE support:
 * - Can ADD COLUMN
 * - Can RENAME COLUMN (SQLite 3.25.0+)
 * - Can DROP COLUMN (SQLite 3.35.0+)
 * - Cannot modify column types or constraints directly
 *
 * For complex changes, we may need to recreate the table.
 */

export type ColumnDef = {
    name: string
    type: string
    notNull?: boolean
    primaryKey?: boolean
    autoIncrement?: boolean
}

export type TableSchema = {
    tableName: string
    columns: ColumnDef[]
    foreignKeys: Array<{
        column: string
        references: string
        onDelete?: string
        onUpdate?: string
    }>
    indexes: Array<{
        name: string
        columns: string[]
        unique?: boolean
    }>
}

export type SchemaDiff = {
    tableName: string
    exists: boolean
    needsRecreate: boolean
    addedColumns: ColumnDef[]
    droppedColumns: ColumnDef[]
    modifiedColumns: Array<{ old: ColumnDef; new: ColumnDef }>
    addedIndexes: TableSchema['indexes'][number][]
    droppedIndexes: TableSchema['indexes'][number][]
    addedForeignKeys: TableSchema['foreignKeys'][number][]
    droppedForeignKeys: TableSchema['foreignKeys'][number][]
}

/**
 * Parse a CREATE TABLE statement into a TableSchema object
 */
export function parseCreateTable(sql: string): TableSchema | null {
    const createMatch = sql.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s*\(([\s\S]+?)\);/i)
    if (!createMatch) return null

    const tableName = createMatch[1]
    const tableBody = createMatch[2]

    const columns: ColumnDef[] = []
    const foreignKeys: TableSchema['foreignKeys'] = []

    // Split by comma, but be careful of nested parentheses
    const parts = splitTableDefinition(tableBody)

    for (const part of parts) {
        const trimmed = part.trim()

        // Check if it's a FOREIGN KEY constraint
        if (trimmed.toUpperCase().startsWith('FOREIGN KEY')) {
            const fkMatch = trimmed.match(/FOREIGN KEY\s*\("?(\w+)"?\)\s*REFERENCES\s*"?(\w+)"?\("?(\w+)"?\)(?:\s*ON DELETE\s+(\w+(?:\s+\w+)?))?(?:\s*ON UPDATE\s+(\w+(?:\s+\w+)?))?/i)
            if (fkMatch) {
                foreignKeys.push({
                    column: fkMatch[1],
                    references: `${fkMatch[2]}(${fkMatch[3]})`,
                    onDelete: fkMatch[4],
                    onUpdate: fkMatch[5],
                })
            }
            continue
        }

        // It's a column definition
        const colMatch = trimmed.match(/"?(\w+)"?\s+(\w+)(.*)/)
        if (colMatch) {
            const name = colMatch[1]
            const type = colMatch[2]
            const rest = colMatch[3].toUpperCase()

            columns.push({
                name,
                type,
                notNull: rest.includes('NOT NULL'),
                primaryKey: rest.includes('PRIMARY KEY'),
                autoIncrement: rest.includes('AUTOINCREMENT'),
            })
        }
    }

    // Parse indexes from separate CREATE INDEX statements
    const indexes: TableSchema['indexes'] = []
    const indexMatches = sql.matchAll(/CREATE\s+(UNIQUE\s+)?INDEX(?:\s+IF NOT EXISTS)?\s+"?(\w+)"?\s+ON\s+"?(\w+)"?\s*\(([^)]+)\);/gi)

    for (const match of indexMatches) {
        const unique = !!match[1]
        const name = match[2]
        const columns = match[4].split(',').map(c => c.trim().replace(/"/g, ''))
        indexes.push({ name, columns, unique })
    }

    return { tableName, columns, foreignKeys, indexes }
}

/**
 * Split table definition by top-level commas (not within parentheses)
 */
function splitTableDefinition(def: string): string[] {
    const parts: string[] = []
    let current = ''
    let depth = 0

    for (const char of def) {
        if (char === '(') depth++
        else if (char === ')') depth--
        else if (char === ',' && depth === 0) {
            parts.push(current.trim())
            current = ''
            continue
        }
        current += char
    }

    if (current.trim()) parts.push(current.trim())
    return parts
}

/**
 * Compare two table schemas and return the differences
 */
export function diffSchemas(oldSchema: TableSchema | null, newSchema: TableSchema): SchemaDiff {
    const diff: SchemaDiff = {
        tableName: newSchema.tableName,
        exists: oldSchema !== null,
        needsRecreate: false,
        addedColumns: [],
        droppedColumns: [],
        modifiedColumns: [],
        addedIndexes: [],
        droppedIndexes: [],
        addedForeignKeys: [],
        droppedForeignKeys: [],
    }

    if (!oldSchema) {
        return diff
    }

    // Compare columns
    const oldColMap = new Map(oldSchema.columns.map(c => [c.name, c]))
    const newColMap = new Map(newSchema.columns.map(c => [c.name, c]))

    for (const newCol of newSchema.columns) {
        const oldCol = oldColMap.get(newCol.name)
        if (!oldCol) {
            diff.addedColumns.push(newCol)
        } else if (!columnsEqual(oldCol, newCol)) {
            diff.modifiedColumns.push({ old: oldCol, new: newCol })
            diff.needsRecreate = true // Column type changes require recreate
        }
    }

    for (const oldCol of oldSchema.columns) {
        if (!newColMap.has(oldCol.name)) {
            diff.droppedColumns.push(oldCol)
        }
    }

    // Get dropped column names for index checking
    const droppedColumnNames = new Set(diff.droppedColumns.map(c => c.name))

    // Compare indexes
    const oldIdxMap = new Map(oldSchema.indexes.map(idx => [idx.name, idx]))
    const newIdxMap = new Map(newSchema.indexes.map(idx => [idx.name, idx]))

    for (const newIdx of newSchema.indexes) {
        const oldIdx = oldIdxMap.get(newIdx.name)
        if (!oldIdx || !indexesEqual(oldIdx, newIdx)) {
            diff.addedIndexes.push(newIdx)
        }
    }

    for (const oldIdx of oldSchema.indexes) {
        const newIdx = newIdxMap.get(oldIdx.name)
        // Drop index if:
        // 1. It no longer exists in new schema
        // 2. It has changed
        // 3. It references a dropped column
        const referencesDroppedColumn = oldIdx.columns.some(col => droppedColumnNames.has(col))
        if (!newIdx || !indexesEqual(oldIdx, newIdx) || referencesDroppedColumn) {
            diff.droppedIndexes.push(oldIdx)
        }
    }

    // Compare foreign keys
    const oldFkMap = new Map(oldSchema.foreignKeys.map((fk, i) => [`${fk.column}:${fk.references}`, fk]))
    const newFkMap = new Map(newSchema.foreignKeys.map((fk, i) => [`${fk.column}:${fk.references}`, fk]))

    for (const [key, newFk] of newFkMap) {
        if (!oldFkMap.has(key)) {
            diff.addedForeignKeys.push(newFk)
            diff.needsRecreate = true // FK changes require recreate
        }
    }

    for (const [key, oldFk] of oldFkMap) {
        if (!newFkMap.has(key)) {
            diff.droppedForeignKeys.push(oldFk)
            diff.needsRecreate = true
        }
    }

    return diff
}

function columnsEqual(a: ColumnDef, b: ColumnDef): boolean {
    return (
        a.name === b.name &&
        a.type === b.type &&
        a.notNull === b.notNull &&
        a.primaryKey === b.primaryKey &&
        a.autoIncrement === b.autoIncrement
    )
}

function indexesEqual(a: TableSchema['indexes'][number], b: TableSchema['indexes'][number]): boolean {
    return (
        a.unique === b.unique &&
        a.columns.length === b.columns.length &&
        a.columns.every((col, i) => col === b.columns[i])
    )
}

/**
 * Generate ALTER TABLE statements for a schema diff
 */
export function generateAlterStatements(diff: SchemaDiff, recreateIfNeeded: boolean = true): string[] {
    const statements: string[] = []
    const { tableName } = diff

    // If table doesn't exist, we can't alter it
    if (!diff.exists) {
        return []
    }

    // If we need to recreate and it's not allowed, throw
    if (diff.needsRecreate && !recreateIfNeeded) {
        throw new Error(`Table ${tableName} requires recreation but recreateIfNeeded is false`)
    }

    // If we need to recreate, return empty (caller should use CREATE TABLE)
    if (diff.needsRecreate) {
        return []
    }

    // IMPORTANT: Order matters for SQLite ALTER TABLE operations

    // 1. Drop indexes that will be removed or that reference columns being dropped
    //    (must be done BEFORE dropping columns)
    for (const idx of diff.droppedIndexes) {
        statements.push(`DROP INDEX IF EXISTS "${idx.name}";`)
    }

    // 2. Drop columns (SQLite 3.35.0+)
    for (const col of diff.droppedColumns) {
        statements.push(`ALTER TABLE "${tableName}" DROP COLUMN "${col.name}";`)
    }

    // 3. Add new columns
    for (const col of diff.addedColumns) {
        const notNull = col.notNull ? ' NOT NULL' : ''
        const defaultVal = col.notNull ? ' DEFAULT NULL' : '' // Need a default if NOT NULL
        statements.push(`ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}${notNull}${defaultVal};`)
    }

    // 4. Add new indexes
    for (const idx of diff.addedIndexes) {
        const unique = idx.unique ? 'UNIQUE ' : ''
        const cols = idx.columns.map(c => `"${c}"`).join(', ')
        statements.push(`CREATE ${unique}INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}" (${cols});`)
    }

    return statements
}
