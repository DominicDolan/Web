import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createDeltaStore, createMarker} from "@web/solid-delta";
import {createEffect, createMemo} from "solid-js";
import {getSingleColorDelta, saveColor} from "~/app/themes/ColorEditor/ColorRepository";
import {debounce} from "@web/utils/Debounce.js";


export const ColorScope = createScopeProvider<{ themeId: string, colorId: string }>();

export const useColorScope = defineScope(ColorScope, (props) => {
    const colorDeltas = createMemo(() => getSingleColorDelta(props.colorId))

    const store = createDeltaStore(() => colorDeltas())
    const [color, setColor] = store
    const [getUncommitted, markCommitted] = createMarker(store)
    createEffect(() => color, (newValue) => {
        console.log("color", newValue)
    })
    markCommitted()

    async function save() {
        debounceSave.cancel()
        const uncommitted = await getUncommitted()
        await saveColor(uncommitted, props.themeId)
    }

    const debounceSave = debounce(save, 1000)

    function updateName(newName: string) {
        setColor(old => {
            old[props.colorId].name = newName
        })
        debounceSave()
    }

    function updateHex(newHex: string) {
        setColor(old => {
            old[props.colorId].hex = newHex
        })
        debounceSave()
    }

    function updateAlpha(newAlpha: number) {
        setColor(old => {
            old[props.colorId].alpha = newAlpha
        })
        debounceSave()
    }
    return {
        updateName,
        updateHex,
        updateAlpha,
        color: () => color[0],
        themeId: () => props.themeId,
    }
})
