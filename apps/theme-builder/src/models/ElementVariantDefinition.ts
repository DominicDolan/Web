import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/schema";

export const elementVariantDefinition = z.object({
    ...modelSchema,
    elementType: z.string(),
    name: z.string(),
    css: z.string(),
}).meta({
    table: createModelSchema("element_variant_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type ElementVariantDefinition = z.infer<typeof elementVariantDefinition>
