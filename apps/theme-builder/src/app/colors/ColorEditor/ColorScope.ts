import {createScopeProvider, defineScope} from "@web/solid-scope";
import {action, createStore, refresh} from "solid-js";
import {getSingleColorDelta} from "~/app/colors/ColorRepository.server";
import {debounce} from "@web/utils/Debounce.js";
import {createDeltaTracker, createModels, ModelDelta} from "@web/solid-delta";
import {ColorTokenDefinition} from "~/models/ColorTokenDefinition.ts";


export const ColorScope = createScopeProvider<{ themeId: string, colorId: string }>();

export const useColorScope = defineScope(ColorScope, (props) => {

    const [colorDeltas, setColorDeltas] = createStore(() => {
        return getSingleColorDelta(props.colorId).then((res) => {
            setTimeout(() => acked.mark(res));
            return res;
        })
    }, [] as ModelDelta<ColorTokenDefinition>[])

    const acked = createDeltaTracker(() => colorDeltas)

    const [colors, createDeltas] = createModels(() => colorDeltas)

    const saveDeltas = action(async function* (deltas?: ModelDelta<ColorTokenDefinition>[]) {
        if (deltas != null) {
            pushColorDeltas(deltas);
        }

        const uncommitted = acked.inverseIncluding(deltas ?? []);
        yield saveColor(uncommitted, props.themeId);

        refresh(colorDeltas);
    })


    function pushColorDeltas(deltas: ModelDelta<ColorTokenDefinition>[]) {
        setColorDeltas((draft) => {
            draft.push(...deltas);
        });
    }

    const debounceSave = debounce(saveDeltas, 1000)

    function setColorValue(key: keyof ColorTokenDefinition, value: ColorTokenDefinition[keyof ColorTokenDefinition], debounce = false) {
        const deltas = createDeltas(props.colorId, {[key]: value})

        if (debounce) {
            pushColorDeltas(deltas)
            debounceSave()
        } else {
            saveDeltas(deltas)
        }
    }

    function updateName(newName: string, debounce = false) {
        setColorValue("name", newName, debounce)
    }

    function updateHex(newHex: string, debounce = false) {
        setColorValue("hex", newHex, debounce)
    }

    function updateAlpha(newAlpha: number, debounce = false) {
        setColorValue("alpha", newAlpha, debounce)
    }

    function updateOnHex(hex: string, debounce = false) {
        setColorValue("onHex", hex, debounce)
    }

    return {
        updateName,
        updateHex,
        updateAlpha,
        updateOnHex,
        color: () => colors[0],
        themeId: () => props.themeId,
    }
})
