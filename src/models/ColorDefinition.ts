import {modelSchema} from "~/data/Model";
import {z} from "zod";
import {createModelSchema} from "~/data/ModelSchemaBuilder";

export const colorDefinitionSchema = modelSchema.extend({
    hex: z.string(),
    alpha: z.number(),
    name: z.string().regex(/^--/)
}).meta({
    table: createModelSchema("color_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type ColorDefinition = z.infer<typeof colorDefinitionSchema>
