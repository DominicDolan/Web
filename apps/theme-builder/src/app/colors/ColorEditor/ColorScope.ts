import {createScopeProvider, defineScope} from "@web/solid-scope";
import {action, createMemo, createStore, refresh} from "solid-js";
import {getSingleColorDeltas, saveColorDeltas} from "~/app/colors/ColorRepository.server";
import {debounce} from "@web/utils/Debounce.js";
import {createDeltaTracker, createModels, ModelDelta} from "@web/solid-delta";
import {ColorTokenDefinition} from "~/models/ColorTokenDefinition.ts";
import {ColorValueDefinition} from "~/models/ColorValueDefinition.ts";

type ColorDefinitions = {
    tokens: ModelDelta<ColorTokenDefinition>[]
    values: ModelDelta<ColorValueDefinition>[]
}

export const ColorScope = createScopeProvider<{ themeId: string, colorId: string }>();

export const useColorScope = defineScope(ColorScope, (props) => {
    const [colorDeltas, setColorDeltas] = createStore(() => {
        return getSingleColorDeltas(props.themeId, props.colorId).then((definitions) => {
            setTimeout(() => {
                ackedTokens.mark(definitions.tokens)
                ackedValues.mark(definitions.values)
            })
            return definitions
        })
    }, {} as ColorDefinitions)

    const ackedTokens = createDeltaTracker(() => colorDeltas.tokens)
    const ackedValues = createDeltaTracker(() => colorDeltas.values)

    const [tokens, createTokenDeltas] = createModels(() => colorDeltas.tokens)
    const [values, createValueDeltas] = createModels(() => colorDeltas.values)

    const colorSchemeNames = createMemo(() => {
        return Array.from(new Set(values.map(value => value.colorScheme)))
    })

    const saveDeltas = action(async function* (
        tokenDeltas?: ModelDelta<ColorTokenDefinition>[],
        valueDeltas?: ModelDelta<ColorValueDefinition>[],
    ) {
        pushColorDeltas(tokenDeltas, valueDeltas)

        const uncommittedTokens = ackedTokens.inverseIncluding(tokenDeltas ?? [])
        const uncommittedValues = ackedValues.inverseIncluding(valueDeltas ?? [])
        yield saveColorDeltas(uncommittedTokens, uncommittedValues, props.themeId)

        refresh(colorDeltas)
    })

    function pushColorDeltas(tokenDeltas?: ModelDelta<ColorTokenDefinition>[], valueDeltas?: ModelDelta<ColorValueDefinition>[]) {
        if (tokenDeltas == null && valueDeltas == null) {
            return
        }

        setColorDeltas((draft) => {
            if (tokenDeltas != null) {
                draft.tokens.push(...tokenDeltas)
            }

            if (valueDeltas != null) {
                draft.values.push(...valueDeltas)
            }
        })
    }

    const debounceSave = debounce(saveDeltas, 1000)

    function updateToken(key: keyof ColorTokenDefinition, value: ColorTokenDefinition[keyof ColorTokenDefinition], shouldDebounce = false) {
        const deltas = createTokenDeltas(props.colorId, {[key]: value})
        save(tokenDeltasOnly(deltas), shouldDebounce)
    }

    function updateValue(colorScheme: string, key: "hex" | "alpha" | "onHex", value: string | number, shouldDebounce = false) {
        const colorValue = values.find(value => value.tokenId === props.colorId && value.colorScheme === colorScheme)
        if (colorValue == null) {
            return
        }

        const deltas = createValueDeltas(colorValue.id, {[key]: value})
        save(valueDeltasOnly(deltas), shouldDebounce)
    }

    function save(deltas: {tokens?: ModelDelta<ColorTokenDefinition>[], values?: ModelDelta<ColorValueDefinition>[]}, shouldDebounce: boolean) {
        if (shouldDebounce) {
            pushColorDeltas(deltas.tokens, deltas.values)
            debounceSave()
        } else {
            saveDeltas(deltas.tokens, deltas.values)
        }
    }

    function tokenDeltasOnly(deltas: ModelDelta<ColorTokenDefinition>[]) {
        return {tokens: deltas}
    }

    function valueDeltasOnly(deltas: ModelDelta<ColorValueDefinition>[]) {
        return {values: deltas}
    }

    return {
        updateName: (name: string, shouldDebounce = false) => updateToken("name", name, shouldDebounce),
        updateCssClass: (cssClass: string, shouldDebounce = false) => updateToken("cssClass", cssClass, shouldDebounce),
        updateHex: (colorScheme: string, hex: string, shouldDebounce = false) => updateValue(colorScheme, "hex", hex, shouldDebounce),
        updateAlpha: (colorScheme: string, alpha: number, shouldDebounce = false) => updateValue(colorScheme, "alpha", alpha, shouldDebounce),
        updateOnHex: (colorScheme: string, onHex: string, shouldDebounce = false) => updateValue(colorScheme, "onHex", onHex, shouldDebounce),
        color: () => tokens[0],
        colorValue: (colorScheme: string) => values.find(value => value.tokenId === props.colorId && value.colorScheme === colorScheme),
        colorSchemeNames,
        themeId: () => props.themeId,
    }
})
