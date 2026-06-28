import {createScopeProvider, defineScope} from "@web/solid-scope";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";
import {action, createMemo, createStore, refresh} from "solid-js";
import {getSingleTypefaceDeltas, saveTypeface} from "~/app/typography/TypefaceRepository.server";
import {defaultTypefacesQueryObject} from "~/constants/DefaultTypefaces";
import {createId} from "@paralleldrive/cuid2";
import {debounce} from "@web/utils/Debounce.js";
import {createDeltaTracker, createModels, ModelDelta} from "@web/solid-delta";
import {TypefaceDefinition} from "~/models/TypefaceDefinition.ts";

export const TypefaceScope = createScopeProvider<{
    themeId: string,
    role: TypefaceRole,
    type: TypefaceType
}>()

function isValidSelector(selector: string): boolean {
    if (!selector) return false;

    try {
        document.createDocumentFragment().querySelector(selector);
    } catch {
        return false;
    }
    return true;
}

export const useTypefaceScope = defineScope(TypefaceScope, (props) => {

    const [typefaceDeltas, setDeltas] = createStore(async () => {
        const res = await getSingleTypefaceDeltas(props.themeId, props.role, props.type);
        acked.mark(res);
        return res;
    }, [] as ModelDelta<TypefaceDefinition>[])

    const acked = createDeltaTracker(() => typefaceDeltas)

    const defaultTypeface = (size: TypefaceSize) => defaultTypefacesQueryObject[props.role][props.type][size]
    const typeface = (size: TypefaceSize) => typefaces.find(t => t.size === size)
    const [typefaces, createDeltas] = createModels(() => typefaceDeltas)

    const getCssOrDefault = (size: TypefaceSize) => typeface(size)?.css ?? defaultTypeface(size).css

    function pushTypefaceDeltas(deltas: ModelDelta<TypefaceDefinition>[]) {
        setDeltas((draft) => {
            draft.push(...deltas);
        });
    }

    const saveDeltas = action(async function* (deltas?: ModelDelta<TypefaceDefinition>[]) {
        if (deltas) {
            pushTypefaceDeltas(deltas);
        }

        const uncommitted = acked.inverseIncluding(deltas ?? []);

        yield saveTypeface(uncommitted, props.themeId)

        refresh(typefaceDeltas);
    })

    const debounceSaveDeltas = debounce(saveDeltas, 1000)

    function createTypefaceWithDefaults(size: TypefaceSize, overrides: Partial<TypefaceDefinition> = {}) {
        const newId = createId()

        return createDeltas("create", {
            id: newId,
            css: overrides.css ?? defaultTypeface(size).css,
            type: overrides.type ?? defaultTypeface(size).type,
            size: overrides.size ?? defaultTypeface(size).size,
            role: overrides.role ?? defaultTypeface(size).role,
            applyAsDefault: overrides.applyAsDefault ?? []
        })
    }

    function updateCss(css: string, debounceSaveChange = false) {
        let id = typefaces[0]?.id
        const deltas = []
        if (id == null) {
            const createDeltas = createTypefaceWithDefaults()
            deltas.push(...createDeltas)
            id = createDeltas[0].id
        }

        const updateDeltas = createDeltas(id, {
            css,
        })

        deltas.push(...updateDeltas)

        pushTypefaceDeltas(deltas)

        if (debounceSaveChange) {
            debounceSaveDeltas()
        } else {
            saveDeltas()
        }
    }

    function addSelector() {
        let id = typefaces[0]?.id
        if (id == null) {
            const deltas = createTypefaceWithDefaults({
                applyAsDefault: [""]
            })
            pushTypefaceDeltas(deltas)
        } else {
            const deltas = createDeltas(id, (draft) => {
                draft.applyAsDefault?.push("")
            })
            pushTypefaceDeltas(deltas)
        }
    }

    function updateSelector(selector: string, index: number, debounceSaveChange = false) {
        let id = typefaces[0]?.id
        if (id == null) {
            const deltas = createTypefaceWithDefaults({
                applyAsDefault: [selector]
            })
            pushTypefaceDeltas(deltas)
        } else {
            const deltas = createDeltas(id, (draft) => {
                draft.applyAsDefault[index] = selector
            })
            pushTypefaceDeltas(deltas)
        }

        if (!isValidSelector(selector)) {
            return
        }

        if (debounceSaveChange) {
            debounceSaveDeltas()
        } else {
            saveDeltas()
        }
    }

    function removeSelector(index: number) {
        const id = typefaces[0]?.id
        if (id == null) return
        const deltas = createDeltas(id, (draft) => {
            draft.applyAsDefault.splice(index, 1)
        })

        saveDeltas(deltas)
    }

    return {
        themeId: () => props.themeId,
        role: () => props.role,
        size: () => props.size,
        type: () => props.type,
        typeface,
        defaultTypeface,
        getCssOrDefault,
        updateCss,
        addSelector,
        updateSelector,
        removeSelector
    }
})
