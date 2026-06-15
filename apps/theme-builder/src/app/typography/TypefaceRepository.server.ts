"use server"

import {useDatabaseTable} from "@web/d1";
import {createModel, ModelDelta} from "@web/solid-delta";
import {TypefaceDefinition, typefaceDefinitionSchema} from "~/models/TypefaceDefinition";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";
import {groupBy} from "@web/utils/GroupBy.ts";


export function getTypefacesForTheme(themeId: string) {
    const db = useDatabaseTable(typefaceDefinitionSchema)
    return db.getMany().byColumn("theme", themeId).execute()
}


export async function getTypefaceDeltas(themeId: string) {
    const db = useDatabaseTable(typefaceDefinitionSchema)

    return await db.getMany()
        .byColumn("theme", themeId)
        .execute() as ModelDelta<TypefaceDefinition>[]
}

export async function getSingleTypefaceDeltas(themeId: string, role: TypefaceRole, size: TypefaceSize, type: TypefaceType) {
    const db = useDatabaseTable(typefaceDefinitionSchema)

    const result = await db.getMany()
        .byColumn("theme", themeId)
        .execute()

    const grouped = groupBy(result, "id")

    for (const id in grouped) {
        const deltas = grouped[id]
        const model = createModel(deltas)

        if (model != undefined && model.role === role && model.size === size && model.type === type) {
            return deltas
        }
    }

    return []
}

export async function saveTypeface(typefaceDeltas: ModelDelta<TypefaceDefinition>[], themeId: string) {
    if (typefaceDeltas.length === 0) return
    const db = useDatabaseTable(typefaceDefinitionSchema)
    await db.insert(typefaceDeltas, {theme: themeId})
}
