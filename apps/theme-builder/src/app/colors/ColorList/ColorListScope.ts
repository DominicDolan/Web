import { defineScope } from '@web/solid-scope'
import { ThemeScope } from '~/app/themes/ThemeEditor/ThemeScope'
import { createModels, ModelDelta, createDeltaTracker } from '@web/solid-delta'
import {
    action,
    flush,
    refresh,
    createStore, createMemo,
} from 'solid-js'
import {getColorDeltas, saveColorDeltas} from '~/app/colors/ColorRepository.server'
import { createId } from '@paralleldrive/cuid2'
import { useNavigate } from '@web/router'
import { ColorTokenDefinition } from '~/models/ColorTokenDefinition.ts'
import {ColorValueDefinition} from "~/models/ColorValueDefinition.ts";

type ColorScheme = {
    tokens: ModelDelta<ColorTokenDefinition>[]
    values: ModelDelta<ColorValueDefinition>[]
}

export const useColorListScope = defineScope(ThemeScope, (props) => {
    const [colorDeltas, setColorDeltas] = createStore(async () => {
        const {tokens, values} = await getColorDeltas(props.theme.id)
        setTimeout(() => ackedTokens.mark(tokens))
        setTimeout(() => ackedValues.mark(values))
        return {tokens, values}
    }, {} as ColorScheme)
    const ackedTokens = createDeltaTracker(() => colorDeltas.tokens)
    const ackedValues = createDeltaTracker(() => colorDeltas.values)

    const [tokens, createTokenDeltas] = createModels(() => colorDeltas.tokens)
    const [values, createValueDeltas] = createModels(() => colorDeltas.values)

    const colorSchemeNames = createMemo(() => Array.from(new Set(values.map(v => v.colorScheme))))

    const navigate = useNavigate()

    const saveDeltas = action(function* (
        tokenDeltas?: ModelDelta<ColorTokenDefinition>[],
        valueDeltas?: ModelDelta<ColorValueDefinition>[],
    ) {
        pushColorDeltas(tokenDeltas, valueDeltas)

        const uncommittedTokens = ackedTokens.inverseIncluding(tokenDeltas ?? [])
        const uncommittedValues = ackedValues.inverseIncluding(valueDeltas ?? [])
        yield saveColorDeltas(uncommittedTokens, uncommittedValues, props.theme.id)

        refresh(colorDeltas)
    })

    function pushColorDeltas(tokenDeltas?: ModelDelta<ColorTokenDefinition>[], valueDeltas?: ModelDelta<ColorValueDefinition>[]) {
        if (tokenDeltas == null && valueDeltas == null) {
            return
        }
        setColorDeltas((old) => {
            if (tokenDeltas != null) {
                old.tokens.push(...tokenDeltas)
            }

            if (valueDeltas != null) {
                old.values.push(...valueDeltas)
            }
        })
    }

    async function addColor() {
        const newId = createId()
        const tokenDeltas = createTokenDeltas('create', {
            id: newId,
            name: '',
            cssClass: "",
        })

        const valueDeltas: ModelDelta<ColorValueDefinition>[] = []

        const schemeNames = colorSchemeNames().length > 0 ? colorSchemeNames() : ["light", "dark"]
        for (const name of schemeNames) {
            valueDeltas.push(...createValueDeltas("create", {
                tokenId: newId,
                hex: "#000000",
                alpha: 1,
                onHex: "#ffffff",
                colorScheme: name,
            }))
        }

        await saveDeltas(tokenDeltas, valueDeltas)

        flush()

        navigate(`/editor/${props.theme.id}/colors/${newId}`)
    }

    function addColorScheme() {
        let colorScheme = "scheme"
        let suffix = 2
        while (colorSchemeNames().includes(colorScheme)) colorScheme = `scheme-${suffix++}`

        const valueDeltas = tokens.flatMap(token => createValueDeltas("create", {
            tokenId: token.id,
            hex: "#000000",
            alpha: 1,
            onHex: "#ffffff",
            colorScheme,
        }))
        saveDeltas(undefined, valueDeltas).then(() => {
            flush()
        })

    }

    function updateColorSchemeName(colorScheme: string, name: string) {
        const nextName = name.trim()
        if (!nextName || nextName === colorScheme || colorSchemeNames().includes(nextName)) return

        const valueDeltas = values
            .filter(value => value.colorScheme === colorScheme)
            .flatMap(value => createValueDeltas(value.id, {colorScheme: nextName}))
        saveDeltas(undefined, valueDeltas)
    }

    function deleteColorScheme(colorScheme: string) {
        const valueDeltas = values
            .filter(value => value.colorScheme === colorScheme)
            .flatMap(value => createValueDeltas("delete", value.id))
        saveDeltas(undefined, valueDeltas)
    }

    function getColorValues(tokenId: string) {
        return values.filter(v => v.tokenId === tokenId)
    }

    return {
        theme: () => props.theme,
        addColor,
        addColorScheme,
        updateColorSchemeName,
        deleteColorScheme,
        colorSchemeNames,
        tokens,
        getColorValues
    }
})
