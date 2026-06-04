import {defineScope} from "@web/solid-scope";
import {ThemeScope} from "~/app/themes/ThemeEditor/ThemeScope";
import {createDeltaStore, createMarker} from "@web/solid-delta";
import {createMemo} from "solid-js";
import {getColorDeltas, saveColor} from "~/app/colors/ColorRepository.server";
import {createId} from "@paralleldrive/cuid2";
import {useNavigate} from "@web/router";


export const useColorListScope = defineScope(ThemeScope, (props) => {

    const colorDeltas = createMemo(() => getColorDeltas(props.theme.id))
    const store = createDeltaStore(() => colorDeltas())
    const [colors, setColors] = store
    const [getUncommitted, markCommitted] = createMarker(store)
    markCommitted()

    const navigate = useNavigate()

    async function save() {
        const uncommitted = await getUncommitted()
        await saveColor(uncommitted, props.theme.id)
    }

    async function addColor() {
        const newId = createId()
        setColors(old => {
            old[newId] = {
                name: "",
                hex: "#000000",
                alpha: 1,
            }
        })
        await save()

        navigate(`/editor/${props.theme.id}/colors/${newId}`)
    }

    return {
        theme: () => props.theme,
        addColor,
        colors
    }
});
