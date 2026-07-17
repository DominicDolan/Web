import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { generateSchema } from "../src/generateSchema"

const fixtureModelsDir = path.resolve(import.meta.dirname, "fixtures/models")
const taskModelsFile = path.join(fixtureModelsDir, "TaskModels.ts")
const linkModelsFile = path.join(fixtureModelsDir, "LinkModels.ts")
const tempDirs: string[] = []

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true })
    }
})

function createTempMigrationsDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "d1-generate-schema-"))
    tempDirs.push(dir)
    return dir
}

function expectTaskModelsSchema(sql: string) {
    expect(sql).toContain(`-- Source: ${path.relative(process.cwd(), taskModelsFile)}`)
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "fixture_task_events"`)
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "fixture_task_read_models"`)
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "fixture_task_history_events"`)
    expect(sql).toContain(`ALTER TABLE "fixture_task_events" ADD COLUMN "fixture_task_read_model_v1_acked_at" INTEGER;`)
    expect(sql).toContain(`ALTER TABLE "fixture_task_events" ADD COLUMN "fixture_task_history_v1_acked_at" INTEGER;`)
}

function expectLinkModelsSchema(sql: string) {
    expect(sql).toContain(`-- Source: ${path.relative(process.cwd(), linkModelsFile)}`)
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "fixture_customer_events"`)
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "fixture_order_events"`)
    expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "fixture_orders_with_customer"`)
    expect(sql).toContain(`ALTER TABLE "fixture_order_events" ADD COLUMN "fixture_orders_with_customer_v1_acked_at" INTEGER;`)
    expect(sql).toContain(`ALTER TABLE "fixture_customer_events" ADD COLUMN "fixture_orders_with_customer_customer_v1_acked_at" INTEGER;`)
}

describe("generateSchema", () => {
    it("loads TaskModels.ts and LinkModels.ts from a folder and emits schema for their projection wrappers", async () => {
        const migrationsDir = createTempMigrationsDir()

        const result = await generateSchema({
            modelsPath: fixtureModelsDir,
            migrationsDir,
        })

        expect(result.status).toBe("written")
        expect(result.path).toBe(path.join(migrationsDir, "0001_generated.sql"))

        const sql = fs.readFileSync(result.path!, "utf8")
        expectTaskModelsSchema(sql)
        expectLinkModelsSchema(sql)
    })

    it("accepts a single model file as the schema source", async () => {
        const migrationsDir = createTempMigrationsDir()

        const result = await generateSchema({
            modelsPath: path.resolve(import.meta.dirname, "fixtures/single/SingleTaskModel.ts"),
            migrationsDir,
        })

        expect(result.status).toBe("written")

        const sql = fs.readFileSync(result.path!, "utf8")
        expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "single_fixture_task_events"`)
        expect(sql).toContain(`CREATE TABLE IF NOT EXISTS "single_fixture_task_read_models"`)
        expect(sql).not.toContain(`fixture_orders_with_customer`)
    })
})
