import {createScopeProvider, defineScope} from "@web/solid-scope";
import {action, createMemo, createOptimisticStore, refresh} from "solid-js";
import {getThemesDeltas, saveTheme} from "~/app/themes/ThemeEditor/ThemeRepository.server";
import {useNavigate} from "@web/router";
import {createId} from "@paralleldrive/cuid2";
import {createModels, ModelDelta} from "@web/solid-delta";
import {createDeltaTracker} from "@web/solid-delta";
import {ThemeDefinition} from "~/models/ThemeDefinition.ts";


export const ThemesListScope = createScopeProvider();

export const useThemesListScope = defineScope(ThemesListScope, () => {

    const [themeDeltas, setOptimisticDeltas] = createOptimisticStore(() => getThemesDeltas().then((res) => {
        setTimeout(() => acked.mark(res))
        return res
    }), [] as ModelDelta<ThemeDefinition>[])
    const acked = createDeltaTracker(() => themeDeltas)

    const [themes, createDeltas] = createModels(() => themeDeltas)

    const navigate = useNavigate()

    const saveDeltas = action(function* (deltas: ModelDelta<ThemeDefinition>[]) {
        setOptimisticDeltas(draft => {
            draft.push(...deltas)
        })

        const uncommitted = acked.inverse()
        yield saveTheme(uncommitted);

        refresh(themeDeltas);
    });

    async function addNewTheme() {
        const newId = createId()
        const deltas = createDeltas("create", {
            id: newId,
            name: "New Theme",
            class: "newTheme",
            mode: "light"
        })

        await saveDeltas(deltas)

        navigate(`/editor/${newId}`)
    }

    async function updateTheme(id: string, theme: Partial<ThemeDefinition>) {
        const deltas = createDeltas(id, theme)
        await saveDeltas(deltas)
    }

    async function deleteTheme(id: string) {
        const deltas = createDeltas("delete", id)
        await saveDeltas(deltas)
    }

    return {
        themes,
        addNewTheme,
        updateTheme,
        deleteTheme,
    }
})
