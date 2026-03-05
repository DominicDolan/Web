import {
    createDeltaStoreTimestampMarker, defineDeltaScope, ModelRecord,
    squashDeltasToSingle
} from "@web/solid-delta";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {ModelData, ModelDelta} from "@web/schema";
import {createMemo} from "solid-js";
import {createId} from "@paralleldrive/cuid2";
import {updateElementStyleAction} from "~/app/elements/repository/ElementStyleRepository";
import {useAction, useSubmission} from "@solidjs/router";
import {createScopeProvider} from "@web/solid-scope";

export const ElementStyleProvider = createScopeProvider<{deltas: ModelRecord<ElementStyleDefinition> | undefined, themeId: string }>()

export const useElementStyleScope = defineDeltaScope(ElementStyleProvider, (props) => {
    const inputElements = createMemo(() => props.models.filter(el => el.element === "input"))

    const timestampMarker = createDeltaStoreTimestampMarker(props.store)
    timestampMarker.markAll()
    const updateElementStyle = useAction(updateElementStyleAction)
    const updateElementStyleSubmission = useSubmission(updateElementStyleAction)

    async function save(id: string) {
        const deltas = timestampMarker.getStreamFromMarked(id)
        if (deltas.length === 0) return

        const delta = squashDeltasToSingle(deltas)
        const themeId = props.props.themeId
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
        props.push(id, payload)
        setTimeout(async () => {
            await save(id)
        })
    }

    const cssContent = createMemo(() => props.models.map(cssRule).join("\n"))
    return {
        elementStyles: props.models,
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
            props.push(id, { variant: variantName })
        },
        cssContent,
        updateCss(id: string, css: string) {
            props.push(id, { css })
        },
        save
    }
})
