import { z } from "zod"
import { modelSchema } from "@web/schema"
import {
    createModelSchema,
    defineReadModelProjection,
} from "@web/d1"

export const singleFixtureTaskSchema = z.object({
    ...modelSchema,
    title: z.string(),
    status: z.string(),
}).meta({
    table: createModelSchema("single_fixture_task_events").build(),
})

export const singleFixtureTaskReadModel = defineReadModelProjection(singleFixtureTaskSchema, {
    name: "single_fixture_task_read_model",
    version: 1,
    tableName: "single_fixture_task_read_models",
})
