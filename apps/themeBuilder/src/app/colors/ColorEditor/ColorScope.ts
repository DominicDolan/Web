import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createDeltaStore, createMarker} from "@web/solid-delta";
import {createEffect, createMemo} from "solid-js";
import {getSingleColorDelta, saveColor} from "~/app/colors/ColorRepository";
import {debounce} from "@web/utils/Debounce.js";


export const ColorScope = createScopeProvider<{ themeId: string, colorId: string }>();

export const useColorScope = defineScope(ColorScope, (props) => {
    const colorDeltas = createMemo(() => getSingleColorDelta(props.colorId))

    const store = createDeltaStore(() => colorDeltas())
    const [color, setColor] = store
    const [getUncommitted, markCommitted] = createMarker(store)
    markCommitted()

    async function save() {
        debounceSave.cancel()
        const uncommitted = await getUncommitted()
        await saveColor(uncommitted, props.themeId)
    }

    const debounceSave = debounce(save, 1000)

    function updateName(newName: string, debounce = false) {
        setColor(old => {
            old[props.colorId].name = newName
        })
        if (debounce) {
            debounceSave()
        } else {
            save()
        }
    }

    function updateHex(newHex: string, debounce = false) {
        setColor(old => {
            old[props.colorId].hex = newHex
        })
        if (debounce) {
            debounceSave()
        } else {
            save()
        }
    }

    function updateAlpha(newAlpha: number, debounce = false) {
        setColor(old => {
            old[props.colorId].alpha = newAlpha
        })
        if (debounce) {
            debounceSave()
        } else {
            save()
        }
    }

    function updateOnHex(hex: string, debounce = false) {
        setColor(old => {
            old[props.colorId].onHex = hex
        })
        if (debounce) {
            debounceSave()
        } else {
            save()
        }
    }
    return {
        updateName,
        updateHex,
        updateAlpha,
        updateOnHex,
        color: () => color[0],
        themeId: () => props.themeId,
    }
})
