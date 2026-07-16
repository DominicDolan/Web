import {z} from "zod";
import {createModelSchema} from "@web/d1";
import {modelSchema} from "@web/schema";

export const colorValueDefinitionSchema = z.object({
    ...modelSchema,
    hex: z.string(),
    alpha: z.number(),
    onHex: z.string(),
    tokenId: z.string(),
    colorScheme: z.string(), // eg. "light" or "dark"
}).meta({
    table: createModelSchema("color_hex_events", { recreate: true })
        .addColumn("theme", "TEXT")
        .build(),
})

export type ColorValueDefinition = z.infer<typeof colorValueDefinitionSchema>
