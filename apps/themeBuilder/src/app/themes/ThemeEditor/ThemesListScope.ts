import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createMemo} from "solid-js";
import {getThemesDeltas} from "~/app/themes/ThemeEditor/ThemeRepository";
import {useLocation, useNavigate} from "@web/router";
import {createDeltaStore} from "@web/solid-delta";
import {createId} from "@paralleldrive/cuid2";


export const ThemesListScope = createScopeProvider();

export const useThemesListScope = defineScope(ThemesListScope, () => {

    const themesDeltas = createMemo(() => {
        return getThemesDeltas();
    })

    const [themes, setThemes] = createDeltaStore(() => themesDeltas())

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
