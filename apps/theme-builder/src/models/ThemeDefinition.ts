import {z} from "zod";
import {createModelSchema, defineReadModelProjection} from "@web/d1";
import {modelSchema} from "@web/schema";

export const themeDefinitionSchema = z.object({
    ...modelSchema,
    name: z.string().trim().nonempty(),
    class: z.string().trim().nonempty(),
    description: z.string().optional(),
}).meta({
    table: createModelSchema("theme_events", { recreate: true }).build(),
})

export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>

// Test read-model projection: keeps a `theme_read_models` table with the
// current state of every theme, derived from the `theme_events` deltas.
export const themeReadProjection = defineReadModelProjection(themeDefinitionSchema, {
    name: "theme_read",
    version: 1,
})

