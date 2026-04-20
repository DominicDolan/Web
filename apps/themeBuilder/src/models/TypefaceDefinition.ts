import {modelSchema} from "@web/schema";
import {createModelSchema} from "@web/d1";
import {z} from "zod";
import {typefaceRoles, typefaceSizes} from "~/constants/TypefaceRoles";

export const typefaceDefinitionSchema = modelSchema.extend({
    role: z.enum(typefaceRoles),
    size: z.enum(typefaceSizes),
    type: z.enum(["default", "variant"]),
    css: z.string(),
    applyAsDefault: z.string().default(""),
}).meta({
    table: createModelSchema("typeface_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type TypefaceDefinition = z.infer<typeof typefaceDefinitionSchema>

