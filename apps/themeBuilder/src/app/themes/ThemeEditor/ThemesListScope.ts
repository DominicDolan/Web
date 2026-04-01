import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createMemo} from "solid-js";
import {getThemesDeltas} from "~/app/themes/ThemeEditor/ThemeRepository";
import {useNavigate} from "@web/router";
import {createDeltaStore} from "@web/solid-delta";
import {createId} from "@paralleldrive/cuid2";
import {createMarker} from "@web/solid-delta";


export const ThemesListScope = createScopeProvider();

export const useThemesListScope = defineScope(ThemesListScope, () => {

    const themesDeltas = createMemo(() => {
        return getThemesDeltas();
    })

    const store = createDeltaStore(() => themesDeltas())
    const [themes, setThemes] = store
    const [marker, setMarker] = createMarker(store)

    const navigate = useNavigate()
    function addNewTheme() {
        const newId = createId()
        setThemes(old => {
            old[newId] = {
                name: "New Theme",
            }
        })
        navigate(`/editor/${newId}`)
    }

    return {
        themes,
        addNewTheme,
        renameTheme: (id: string, newName: string) => {
            setThemes(old => {
                old[id].name = newName
            })
        },
        removeTheme: (id: string) => {
            setThemes(old => {
                delete old[id]
            })
        },
        changeThemeDescription: (id: string, newDescription: string) => {
            setThemes(old => {
                old[id].description = newDescription
            })
        }
    }
})
