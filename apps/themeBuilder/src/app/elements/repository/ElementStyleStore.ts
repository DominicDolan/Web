import {createContextStoreWithDeltaAdapter, DeltaAdapterParams} from "@web/delta";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {ModelDelta} from "@web/schema";
import {createMemo} from "solid-js";
import {createId} from "@paralleldrive/cuid2";


export const [useElementStyleStore] = createContextStoreWithDeltaAdapter((params: DeltaAdapterParams<{
    deltas: Record<string, ModelDelta<ElementStyleDefinition>[]>
    themeId: string | undefined
}, ElementStyleDefinition>) => {

    const inputElements = createMemo(() => params.models.filter(el => el.element === "input"))

    function cssRule(element: ElementStyleDefinition) {
        return `${element.element}.${element.variant} { ${element.css} }`
    }

    const cssContent = createMemo(() => params.models.map(cssRule).join("\n"))
    return {
        elementStyles: params.models,
        inputElements,
        addInputVariant(variantName: string) {
            params.push(createId(), {
                element: "input",
                variant: variantName,
                css: "border: 1px solid black;"
            })
        },
        renameVariant(id: string, variantName: string) {
            params.push(id, { variant: variantName })
        },
        cssContent,
        updateCss(id: string, css: string) {
            params.push(id, { css })
        }
    }
})
