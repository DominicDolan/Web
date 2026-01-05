import {modelSchema} from "~/data/Model";
import {z} from "zod";

export const themeDefinitionSchema = modelSchema.extend({
    name: z.string().trim(),
    description: z.string().optional(),
})

export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>
