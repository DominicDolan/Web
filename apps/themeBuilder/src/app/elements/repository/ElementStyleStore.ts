import {
    createContextStoreWithDeltaAdapter,
    createDeltaStoreTimestampMarker,
    DeltaAdapterParams,
    squashDeltasToSingle
} from "@web/delta";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {ModelData, ModelDelta} from "@web/schema";
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

    function addVariant(payload: Partial<ModelData<ElementStyleDefinition>>) {
        const id = createId()
        params.push(id, payload)
        setTimeout(async () => {
            await save(id)
        })
    }

    const cssContent = createMemo(() => params.models.map(cssRule).join("\n"))
    return {
        elementStyles: params.models,
        addInputVariant(variantName: string) {
            addVariant({
                element: "input",
                variant: variantName,
                css: "  border: 1px solid black;"
            })
        },
        addButtonVariant(variantName: string) {
            addVariant({
                element: "button",
                variant: variantName,
                css: "  border-radius: 4px;\n  background-color: black;\n  color: white;"
            })
        },
        addCardVariant(variantName: string) {
            addVariant({
                element: "card",
                variant: variantName,
                css: "  --shadow-color: rgba(0, 0, 0, 0.15)\n" +
                    "  box-shadow:\n" +
                    "    0 8px 12px -1px var(--shadow-color),\n" +
                    "    0 4px 6px -1px var(--shadow-color);\n" +
                    "  border-radius: 6px;\n"
            })
        },
        addListVariant(variantName: string) {
            addVariant({
                element: "ul",
                variant: variantName,
                css: "  background-color: white;\n" +
                    "  border-radius: 10px;\n" +
                    "  & > li {\n" +
                    "    padding: 0.5rem;\n" +
                    "    border-bottom: 1px solid rgb(0 0 0 / 0.4);\n" +
                    "  }\n"
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
