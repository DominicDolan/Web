"use server"

import {useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/solid-delta";
import {ColorDefinition, colorDefinitionSchema} from "~/models/ColorDefinition";

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
