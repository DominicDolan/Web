import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/schema";

export const themeDefinitionSchema = z.object({
    ...modelSchema,
    name: z.string().trim().nonempty(),
    class: z.string().trim().nonempty(),
    description: z.string().optional(),
    mode: z.enum(["light", "dark"]).default("light"),
}).meta({
    table: createModelSchema("theme_events", { recreate: true }).build(),
})

export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>
