import {modelSchema} from "@web/schema";
import {createModelSchema} from "@web/d1";
import {z} from "zod";
import {typefaceRoles, typefaceSizes} from "~/constants/TypefaceRoles";

export const typefaceDefinitionSchema = z.object({
    ...modelSchema,
    role: z.enum(typefaceRoles),
    type: z.enum(["default", "variant"]),
    css: z.string(),
    largeCss: z.string(),
    mediumCss: z.string(),
    smallCss: z.string(),
    applyAsDefault: z.array(z.string().default("")),
}).meta({
    table: createModelSchema("typeface_events", { recreate: true }).addColumn("theme", "TEXT").build(),
})

export type TypefaceDefinition = z.infer<typeof typefaceDefinitionSchema>

