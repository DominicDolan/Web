import { defineScope } from '@web/solid-scope'
import { ThemeScope } from '~/app/themes/ThemeEditor/ThemeScope'
import { createModels, ModelDelta, createDeltaTracker } from '@web/solid-delta'
import {
    action,
    flush,
    refresh,
    createStore,
} from 'solid-js'
import { getColorDeltas, saveColor } from '~/app/colors/ColorRepository.server'
import { createId } from '@paralleldrive/cuid2'
import { useNavigate } from '@web/router'
import { ColorDefinition } from '~/models/ColorDefinition.ts'

export const useColorListScope = defineScope(ThemeScope, (props) => {
    const [colorDeltas, setColorDeltas] = createStore(async () => {
        const res = await getColorDeltas(props.theme.id)
        setTimeout(() => acked.mark(res))
        return res
    }, [] as ModelDelta<ColorDefinition>[])
    const acked = createDeltaTracker(() => colorDeltas)

    const [colors, createDeltas] = createModels(() => colorDeltas)

    const navigate = useNavigate()

    const saveDeltas = action(function* (
        deltas?: ModelDelta<ColorDefinition>[]
    ) {
        if (deltas != null) {
            pushColorDeltas(deltas)
        }

        const uncommitted = acked.inverseIncluding(deltas ?? [])
        yield saveColor(uncommitted, props.theme.id)

        refresh(colorDeltas)
    })

    function pushColorDeltas(deltas: ModelDelta<ColorDefinition>[]) {
        setColorDeltas((old) => {
            old.push(...deltas)
        })
    }

    async function addColor() {
        const newId = createId()
        const deltas = createDeltas('create', {
            id: newId,
            name: '',
            hex: '#000000',
            alpha: 1,
            cssClass: "",
            onHex: "",
        })

        pushColorDeltas(deltas)

        navigate(`/editor/${props.theme.id}/colors/${newId}`)

        flush()
        await saveDeltas()
    }

    return {
        theme: () => props.theme,
        addColor,
        colors,
    }
})
