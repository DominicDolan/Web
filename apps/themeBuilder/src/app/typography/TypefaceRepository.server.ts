import {useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/solid-delta";
import {TypefaceDefinition, typefaceDefinitionSchema} from "~/models/TypefaceDefinition";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";


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

    return await db.getMany()
        .byColumn("theme", themeId)
        .byPath("role", role)
        .byPath("size", size)
        .byPath("type", type)
        .execute()
}
