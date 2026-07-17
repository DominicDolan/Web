import { z } from "zod"
import { modelSchema } from "@web/schema"
import {
    createModelSchema,
    defineChangeHistoryProjection,
    defineProjectionAckPolicy,
    defineReadModelProjection,
} from "@web/d1"

export const fixtureTaskSchema = z.object({
    ...modelSchema,
    title: z.string(),
    status: z.string(),
    priority: z.number().optional(),
}).meta({
    table: createModelSchema("fixture_task_events").build(),
})

export const fixtureTaskReadModel = defineReadModelProjection(fixtureTaskSchema, {
    name: "fixture_task_read_model",
    version: 1,
    tableName: "fixture_task_read_models",
    indexes: ["status"],
})

export const fixtureTaskHistory = defineChangeHistoryProjection(fixtureTaskSchema, {
    name: "fixture_task_history",
    version: 1,
    tableName: "fixture_task_history_events",
    extraColumns: {
        source: {
            type: "TEXT",
            value: () => "test",
        },
    },
})

export const fixtureTaskAckPolicy = defineProjectionAckPolicy(fixtureTaskReadModel)
