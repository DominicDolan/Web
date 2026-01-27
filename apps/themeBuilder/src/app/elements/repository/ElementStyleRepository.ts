import {useDatabaseTable} from "@web/d1";
import {ElementStyleDefinition, elementStyleDefinition} from "~/models/ElementStyleDefinition";
import {
    calculateDelta,
    createModelStore,
    deltaArrayToGroup,
    squashDeltasToSingle
} from "@web/delta";
import {action, json, query} from "@solidjs/router";
import {zodResponse} from "@web/utils";
import {ModelDelta} from "@web/schema";

export const getElementStyles = query(async (themeId: string) => {
    "use server"
    const db = useDatabaseTable(elementStyleDefinition)

    const definitions = await db.getManyBy("theme", themeId)

    return deltaArrayToGroup(definitions)
}, "getElementStyles")

export const updateElementStyle = action(async (delta: ModelDelta<ElementStyleDefinition>, themeId) => {
    "use server"
    const db = useDatabaseTable(elementStyleDefinition)

    const existingDeltas = await db.getOne(delta.modelId)

    const modelId = delta.modelId
    const [_, push] = createModelStore({[modelId]: existingDeltas})

    const model = push(delta.modelId, delta.payload)

    const result = await elementStyleDefinition.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])
        if (deltaToSave) {
            try {
                await db.insert(deltaToSave, { "theme": themeId})
            } catch (e) {
                console.error("Error saving color delta:", e)
                return json({
                    success: false,
                    error: e,
                    updatedAt: existingDeltas.at(-1)?.timestamp ?? 0
                })
            }
        }
    }

    return zodResponse(result)
})
