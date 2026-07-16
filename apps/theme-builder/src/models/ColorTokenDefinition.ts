import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/schema";

export const colorTokenDefinitionSchema = z.object({
    ...modelSchema,
    name: z.string().regex(/^--/),
    cssClass: z.string(),
}).meta({
    table: createModelSchema("color_token_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type ColorTokenDefinition = z.infer<typeof colorTokenDefinitionSchema>
