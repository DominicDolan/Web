import { DatabaseSync } from "node:sqlite"
import type { ProjectionRunnerDb, ProjectionRunnerStatement } from "../src/projections/ProjectionRunnerShared"

class InMemoryD1Statement implements ProjectionRunnerStatement {
    private readonly statement
    private bindings: unknown[] = []

    constructor(statement: ReturnType<DatabaseSync["prepare"]>) {
        this.statement = statement
    }

    bind(...args: unknown[]) {
        this.bindings = args
        return this
    }

    async run() {
        return this.statement.run(...this.bindings)
    }

    async all<T = any>() {
        return { results: this.statement.all(...this.bindings) as T[] }
    }
}

export class InMemoryD1 implements ProjectionRunnerDb {
    private readonly sqlite = new DatabaseSync(":memory:")

    prepare(sql: string) {
        return new InMemoryD1Statement(this.sqlite.prepare(sql))
    }

    close() {
        this.sqlite.close()
    }
}
