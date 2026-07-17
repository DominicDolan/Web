import {createScopeProvider, defineScope} from "@web/solid-scope";
import {action, createMemo, createStore, refresh} from "solid-js";
import {getColorDeltas, saveColorDeltas} from "~/app/colors/ColorRepository.server";
import {debounce} from "@web/utils/Debounce.js";
import {createDeltaTracker, createModels, ModelDelta} from "@web/solid-delta";
import {ColorTokenDefinition} from "~/models/ColorTokenDefinition.ts";
import {ColorValueDefinition} from "~/models/ColorValueDefinition.ts";

type ColorDefinitions = {
    tokens: ModelDelta<ColorTokenDefinition>[]
    values: ModelDelta<ColorValueDefinition>[]
}

const defaultColorValue = {
    hex: "#000000",
    alpha: 1,
    onHex: "#ffffff",
}

export const ColorScope = createScopeProvider<{ themeId: string, tokenId: string }>();

export const useColorScope = defineScope(ColorScope, (props) => {
    const [colorDeltas, setColorDeltas] = createStore(() => {
        return getColorDeltas(props.themeId).then((definitions) => {
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

    const colorSchemeNames = createMemo(() => Array.from(new Set(values.map(value => value.colorScheme))))

    const saveDeltas = action(async function* (
        tokenDeltas?: ModelDelta<ColorTokenDefinition>[],
        valueDeltas?: ModelDelta<ColorValueDefinition>[],
    ) {
        pushColorDeltas(tokenDeltas, valueDeltas)
        yield saveColorDeltas(
            ackedTokens.inverseIncluding(tokenDeltas ?? []),
            ackedValues.inverseIncluding(valueDeltas ?? []),
            props.themeId,
        )
        refresh(colorDeltas)
    })

    function pushColorDeltas(tokenDeltas?: ModelDelta<ColorTokenDefinition>[], valueDeltas?: ModelDelta<ColorValueDefinition>[]) {
        if (tokenDeltas == null && valueDeltas == null) return

        setColorDeltas((draft) => {
            if (tokenDeltas != null) draft.tokens.push(...tokenDeltas)
            if (valueDeltas != null) draft.values.push(...valueDeltas)
        })
    }

    const debounceSave = debounce(saveDeltas, 1000)

    function save(deltas: {tokens?: ModelDelta<ColorTokenDefinition>[], values?: ModelDelta<ColorValueDefinition>[]}, shouldDebounce: boolean) {
        if (shouldDebounce) {
            pushColorDeltas(deltas.tokens, deltas.values)
            debounceSave()
        } else {
            saveDeltas(deltas.tokens, deltas.values)
        }
    }

    function updateToken(key: keyof ColorTokenDefinition, value: ColorTokenDefinition[keyof ColorTokenDefinition], shouldDebounce = false) {
        save({tokens: createTokenDeltas(props.tokenId, {[key]: value})}, shouldDebounce)
    }

    function createColorValue(tokenId: string, colorScheme: string, changes: Partial<typeof defaultColorValue> = {}) {
        return createValueDeltas("create", {
            tokenId,
            colorScheme,
            ...defaultColorValue,
            ...changes,
        })
    }

    function updateValue(colorScheme: string, key: keyof typeof defaultColorValue, value: string | number, shouldDebounce = false) {
        const colorValue = values.find(value => value.tokenId === props.tokenId && value.colorScheme === colorScheme)
        const changes = {[key]: value} as Partial<typeof defaultColorValue>
        const deltas = colorValue == null
            ? createColorValue(props.tokenId, colorScheme, changes)
            : createValueDeltas(colorValue.id, changes)
        save({values: deltas}, shouldDebounce)
    }

    function addColorScheme() {
        let colorScheme = "scheme"
        let suffix = 2
        while (colorSchemeNames().includes(colorScheme)) colorScheme = `scheme-${suffix++}`

        const deltas = tokens.flatMap(token => createColorValue(token.id, colorScheme))
        save({values: deltas}, false)
        return colorScheme
    }

    function updateColorSchemeName(colorScheme: string, name: string, shouldDebounce = false) {
        if (!name.trim() || name === colorScheme || colorSchemeNames().includes(name)) return

        const deltas = values
            .filter(value => value.colorScheme === colorScheme)
            .flatMap(value => createValueDeltas(value.id, {colorScheme: name}))
        save({values: deltas}, shouldDebounce)
    }

    function deleteColorScheme(colorScheme: string) {
        const deltas = values
            .filter(value => value.colorScheme === colorScheme)
            .flatMap(value => createValueDeltas("delete", value.id))
        save({values: deltas}, false)
    }

    function colorValue(colorScheme: string): ColorValueDefinition | undefined {
        return values.find(value => value.tokenId === props.tokenId && value.colorScheme === colorScheme)
            ?? (colorScheme ? {
                id: `unsaved-${props.tokenId}-${colorScheme}`,
                tokenId: props.tokenId,
                colorScheme,
                ...defaultColorValue,
                updatedAt: 0,
            } : undefined)
    }

    return {
        updateName: (name: string, shouldDebounce = false) => updateToken("name", name, shouldDebounce),
        updateCssClass: (cssClass: string, shouldDebounce = false) => updateToken("cssClass", cssClass, shouldDebounce),
        updateHex: (colorScheme: string, hex: string, shouldDebounce = false) => updateValue(colorScheme, "hex", hex, shouldDebounce),
        updateAlpha: (colorScheme: string, alpha: number, shouldDebounce = false) => updateValue(colorScheme, "alpha", alpha, shouldDebounce),
        updateOnHex: (colorScheme: string, onHex: string, shouldDebounce = false) => updateValue(colorScheme, "onHex", onHex, shouldDebounce),
        addColorScheme,
        updateColorSchemeName,
        deleteColorScheme,
        token: () => {
            const token = tokens.find(token => token.id === props.tokenId);
            if (token == null) {
                throw new Error(`Token with id ${props.tokenId} not found`);
            }
            return token
        },
        colorValue,
        colorSchemeNames,
        themeId: () => props.themeId,
    }
})
