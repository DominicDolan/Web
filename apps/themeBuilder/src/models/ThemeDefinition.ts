import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/delta";

export const themeDefinitionSchema = modelSchema.extend({
    name: z.string().trim(),
    description: z.string().optional(),
}).meta({
    table: createModelSchema("theme_events", { recreate: true }).build(),
})

export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>
