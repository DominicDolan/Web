import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createMemo} from "solid-js";
import {getThemesDeltas, saveTheme} from "~/app/themes/ThemeEditor/ThemeRepository";
import {useNavigate} from "@web/router";
import {createDeltaStore} from "@web/solid-delta";
import {createId} from "@paralleldrive/cuid2";
import {createMarker} from "@web/solid-delta";
import {debounce} from "@web/utils/Debounce.js";


export const ThemesListScope = createScopeProvider();

export const useThemesListScope = defineScope(ThemesListScope, () => {

    const themesDeltas = createMemo(() => {
        return getThemesDeltas();
    })

    const store = createDeltaStore(() => themesDeltas())
    const [themes, setThemes] = store
    const [getUncommitted, markCommitted] = createMarker(store)
    markCommitted()

    const navigate = useNavigate()
    function addNewTheme() {
        const newId = createId()
        setThemes(old => {
            old[newId] = {
                name: "New Theme",
            }
        })
        save()
        navigate(`/editor/${newId}`)
    }

    async function save() {
        const uncommitted = await getUncommitted()

        await saveTheme(uncommitted)
    }

    const debounceSave = debounce(save, 1000)

    return {
        themes,
        addNewTheme,
        renameTheme: (id: string, newName: string) => {
            setThemes(old => {
                old[id].name = newName
            })
            debounceSave()
        },
        removeTheme: (id: string) => {
            setThemes(old => {
                delete old[id]
            })
            save()
        },
        changeThemeDescription: (id: string, newDescription: string) => {
            setThemes(old => {
                old[id].description = newDescription
            })
            debounceSave()
        }
    }
})
