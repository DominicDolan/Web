import {createScopeProvider, defineScope} from "@web/solid-scope";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";
import {createMemo} from "solid-js";
import {getSingleTypefaceDeltas, saveTypeface} from "~/app/typography/TypefaceRepository.server";
import {createDeltaStore, createMarker} from "@web/solid-delta";
import {defaultTypefacesQueryObject} from "~/constants/DefaultTypefaces";
import {createId} from "@paralleldrive/cuid2";
import {debounce} from "@web/utils/Debounce.js";

export const TypefaceScope = createScopeProvider<{
    themeId: string,
    role: TypefaceRole,
    size: TypefaceSize,
    type: TypefaceType
}>()

export const useTypefaceScope = defineScope(TypefaceScope, (props) => {

    const typefaceDeltas = createMemo(() => getSingleTypefaceDeltas(props.themeId, props.role, props.size, props.type))

    const defaultTypeface = createMemo(() => defaultTypefacesQueryObject[props.role][props.type][props.size])
    const store = createDeltaStore(() => typefaceDeltas())
    const [typefaces, setTypeface] = store
    const [getUncommitted, markCommitted] = createMarker(store)
    markCommitted()

    const typeface = createMemo(() => typefaces[0] ?? defaultTypeface())
    const getCssOrDefault = () => typeface().css

    async function save() {
        debounceSave.cancel()
        const uncommitted = await getUncommitted()
        await saveTypeface(uncommitted, props.themeId)
    }

    const debounceSave = debounce(save, 1000)

    function updateCss(css: string, debounceSaveChange = false) {
        setTypeface(old => {
            const id = typefaces[0]?.id ?? createId()

            if (old[id] == null) {
                old[id] = {
                    css: defaultTypeface().css,
                }
            }

            old[id].css = css
        })

        if (debounceSaveChange) {
            debounceSave()
        } else {
            save()
        }
    }

    function addSelector() {
        setTypeface(old => {
            const id = typefaces[0]?.id ?? createId()

            if (old[id]?.applyAsDefault != null) {
                old[id].applyAsDefault.push("")
            } else {
                old[id].applyAsDefault = [""]
            }
        })

        save()
    }

    function updateSelector(selector: string, index: number, debounceSaveChange = false) {
        setTypeface(old => {
            const id = typefaces[0]?.id ?? createId()

            if (old[id]?.applyAsDefault == null) {
                old[id].applyAsDefault = []
            }

            old[id].applyAsDefault[index] = selector
        })

        if (debounceSaveChange) {
            debounceSave()
        } else {
            save()
        }
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
    }
})
