"use server"

import {getDB, useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/solid-delta";
import {ColorTokenDefinition, colorTokenDefinitionSchema} from "~/models/ColorTokenDefinition.ts";
import {ColorValueDefinition, colorValueDefinitionSchema} from "~/models/ColorValueDefinition.ts";

export type ColorPaletteRow = {
    id: number;
    source: "tailwind" | "material";
    group_name: string;
    color_name: string;
    shade: string | null;
    color_key: string;
    hex_value: string;
    redness: number;
    greenness: number;
    blueness: number;
    lightness: number;
    created_at: number;
};

async function getColorTokens(themeId: string) {
    const db = useDatabaseTable(colorTokenDefinitionSchema)

    return await db.getMany()
        .byColumn("theme", themeId)
        .execute() as ModelDelta<ColorTokenDefinition>[]
}

async function getColorValues(themeId: string) {
    const db = useDatabaseTable(colorValueDefinitionSchema)

    return await db.getMany()
        .byColumn("theme", themeId)
        .execute() as ModelDelta<ColorValueDefinition>[]
}

export async function getColorDeltas(themeId: string) {

    const [tokens, values] = await Promise.all([getColorTokens(themeId), getColorValues(themeId)])

    return {tokens, values}
}

export async function getSingleColorDeltas(themeId: string, colorId: string) {
    const tokenDatabase = useDatabaseTable(colorTokenDefinitionSchema)
    const valueDatabase = useDatabaseTable(colorValueDefinitionSchema)

    const [tokens, values] = await Promise.all([
        tokenDatabase.getOne(colorId) as Promise<ModelDelta<ColorTokenDefinition>[]>,
        valueDatabase.getMany()
            .byColumn("theme", themeId)
            .execute() as Promise<ModelDelta<ColorValueDefinition>[]>,
    ])

    return {tokens, values}
}

export async function saveColorToken(colorDeltas: ModelDelta<ColorTokenDefinition>[], themeId: string) {
    if (colorDeltas.length === 0) return
    const db = useDatabaseTable(colorTokenDefinitionSchema)
    await db.insert(colorDeltas, { theme: themeId })
}

export async function saveColorValue(colorDeltas: ModelDelta<ColorValueDefinition>[], themeId: string) {
    if (colorDeltas.length === 0) return
    const db = useDatabaseTable(colorValueDefinitionSchema)
    await db.insert(colorDeltas, { theme: themeId })
}

export async function saveColorDeltas(tokenDeltas: ModelDelta<ColorTokenDefinition>[], valueDeltas: ModelDelta<ColorValueDefinition>[], themeId: string) {
    await saveColorToken(tokenDeltas, themeId)
    await saveColorValue(valueDeltas, themeId)
}

export async function getColorPalette() {
    const db = getDB()

    const {results} = await db.prepare(`SELECT
          id,
          source,
          group_name,
          color_name,
          shade,
          color_key,
          hex_value,
          redness,
          greenness,
          blueness,
          lightness,
          created_at
        FROM color_palettes
        ORDER BY source, group_name, shade;`)
        .all<ColorPaletteRow>()
    return results
}
