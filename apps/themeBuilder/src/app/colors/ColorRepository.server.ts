"use server"

import {useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/solid-delta";
import {ColorDefinition, colorDefinitionSchema} from "~/models/ColorDefinition";
import {getDB} from "@web/d1";

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

export async function getColorDeltas(themeId: string) {
    const db = useDatabaseTable(colorDefinitionSchema)

    return (await db.getManyBy("theme", themeId)) as ModelDelta<ColorDefinition>[]
}

export async function getSingleColorDelta(colorId: string) {
    const db = useDatabaseTable(colorDefinitionSchema)
    return (await db.getOne(colorId) as ModelDelta<ColorDefinition>[])
}

export async function saveColor(colorDeltas: ModelDelta<ColorDefinition>[], themeId: string) {
    if (colorDeltas.length === 0) return
    const db = useDatabaseTable(colorDefinitionSchema)
    await db.insert(colorDeltas, { theme: themeId })
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
