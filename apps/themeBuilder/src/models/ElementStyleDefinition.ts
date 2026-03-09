import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/schema";

export const elementStyleDefinition = modelSchema.extend({
    element: z.string(),
    variant: z.string(),
    css: z.string(),
}).meta({
    table: createModelSchema("element_style_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type ElementStyleDefinition = z.infer<typeof elementStyleDefinition>
