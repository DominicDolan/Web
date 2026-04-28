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
            const id = typefaces[0]?.id ?? Object.keys(old)[0] ?? createId()

            if (old[id] == null) {
                old[id] = {
                    role: props.role,
                    size: props.size,
                    type: props.type,
                    css: defaultTypeface().css,
                    applyAsDefault: defaultTypeface().applyAsDefault,
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

    return {
        themeId: () => props.themeId,
        role: () => props.role,
        size: () => props.size,
        type: () => props.type,
        typeface,
        defaultTypeface,
        getCssOrDefault,
        updateCss,
    }
})
