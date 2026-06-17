import {useDatabaseTable} from "@web/d1";
import {ElementVariantDefinition, elementVariantDefinition} from "~/models/ElementVariantDefinition.ts";
import {ModelDelta} from "@web/solid-delta";


export async function getElementVariantDeltas(themeId: string) {

    await new Promise((resolve) => setTimeout(resolve, 1000))
    const db = useDatabaseTable(elementVariantDefinition)

    return await db.getMany()
        .byColumn("theme", themeId)
        .execute()
}

export async function saveElementVariantDeltas(deltas: ModelDelta<ElementVariantDefinition>[], themeId: string) {
    const db = useDatabaseTable(elementVariantDefinition)
    await db.insert(deltas, {theme: themeId})
}
