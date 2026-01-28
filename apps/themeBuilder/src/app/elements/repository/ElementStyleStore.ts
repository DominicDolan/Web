import {
    createContextStoreWithDeltaAdapter,
    createDeltaStoreTimestampMarker,
    DeltaAdapterParams,
    squashDeltasToSingle
} from "@web/delta";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {ModelDelta} from "@web/schema";
import {createMemo} from "solid-js";
import {createId} from "@paralleldrive/cuid2";
import {updateElementStyleAction} from "~/app/elements/repository/ElementStyleRepository";
import {useAction, useSubmission} from "@solidjs/router";


export const [useElementStyleStore] = createContextStoreWithDeltaAdapter((params: DeltaAdapterParams<{
    deltas: Record<string, ModelDelta<ElementStyleDefinition>[]>
    themeId: string | undefined
}, ElementStyleDefinition>) => {

    const inputElements = createMemo(() => params.models.filter(el => el.element === "input"))

    const timestampMarker = createDeltaStoreTimestampMarker(params.store)
    timestampMarker.markAll()
    const updateElementStyle = useAction(updateElementStyleAction)
    const updateElementStyleSubmission = useSubmission(updateElementStyleAction)

    async function save(id: string) {
        const deltas = timestampMarker.getStreamFromMarked(id)
        if (deltas.length === 0) return

        const delta = squashDeltasToSingle(deltas)
        const themeId = params.props.themeId
        if (delta == null || themeId == null) return

        updateElementStyleSubmission.clear()
        await updateElementStyle(delta, themeId)

        if (updateElementStyleSubmission.result?.success) {
            timestampMarker.mark(id)
        }
    }

    function cssRule(element: ElementStyleDefinition) {
        return `${element.element}.${element.variant} { ${element.css} }`
    }

    const cssContent = createMemo(() => params.models.map(cssRule).join("\n"))
    return {
        elementStyles: params.models,
        inputElements,
        addInputVariant(variantName: string) {
            const id = createId()
            params.push(id, {
                element: "input",
                variant: variantName,
                css: "  border: 1px solid black;"
            })
            setTimeout(async () => {
                await save(id)
            })
        },
        renameVariant(id: string, variantName: string) {
            params.push(id, { variant: variantName })
        },
        cssContent,
        updateCss(id: string, css: string) {
            params.push(id, { css })
        },
        save
    }
})
