import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/schema";

export const colorDefinitionSchema = modelSchema.extend({
    hex: z.string(),
    alpha: z.number(),
    name: z.string().regex(/^--/),
    cssClass: z.string(),
    onHex: z.string(),
}).meta({
    table: createModelSchema("color_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type ColorDefinition = z.infer<typeof colorDefinitionSchema>
