import {createScopeProvider, defineScope} from "@web/solid-scope";
import {elementCategories} from "~/app/elements/elementCategories.ts";
import {action, createMemo, createStore, refresh} from "solid-js";
import {getElementVariantDeltas, saveElementVariantDeltas} from "~/app/elements/ElementRepository.server.ts";
import {createDeltaTracker, createModels, ModelDelta} from "@web/solid-delta";
import {ElementVariantDefinition} from "~/models/ElementVariantDefinition.ts";
import {createId} from "@paralleldrive/cuid2";

export const ElementEditorScope = createScopeProvider<{
    themeId: string
    elementType: string
}>()

export const useElementEditorScope = defineScope(ElementEditorScope, (props) => {

    const elementCategory = createMemo(() => {
        const category = elementCategories.find(c => c.type === props.elementType);
        if (category == null) {
            throw new Error(`Element category not found for type: ${props.elementType}`);
        }
        return category;
    })


    const [variantDeltas, setDeltas] = createStore(async () => {
        const res = await getElementVariantDeltas(props.themeId);
        acked.mark(res);
        return res;
    }, [] as ModelDelta<ElementVariantDefinition>[])

    const acked = createDeltaTracker(() => variantDeltas)

    const [elementVariants, createDeltas] = createModels(() => variantDeltas)

    function pushDeltas(deltas: ModelDelta<ElementVariantDefinition>[]) {
        setDeltas((draft) => {
            draft.push(...deltas);
        })
    }

    const saveDeltas = action(async function* (deltas?: ModelDelta<ElementVariantDefinition>[]) {
        if (deltas) {
            pushDeltas(deltas);
        }

        const uncommitted = acked.inverseIncluding(deltas ?? []);

        yield saveElementVariantDeltas(uncommitted, props.themeId)

        refresh(variantDeltas);
    })

    async function createNewVariant(name: string) {
        const id = createId()

        const deltas = createDeltas("create", {
            id,
            name,
            elementType: props.elementType,
            css: "",
        })

        await saveDeltas(deltas)
    }

    return {
        themeId: () => props.themeId,
        elementType: () => props.elementType,
        elementName: () => elementCategories.find(c => c.type === props.elementType)?.name ?? props.elementType,
        elementCategory,
        elementVariants,
        createNewVariant
    }
})
