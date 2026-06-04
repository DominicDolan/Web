import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createMemo} from "solid-js";
import {ThemeDefinition} from "~/models/ThemeDefinition";
import {useThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {useNavigate} from "@web/router";


export const ThemeScope = createScopeProvider<{
    theme: ThemeDefinition
}>()

export const useThemeScope = defineScope(ThemeScope, ({ theme }) => {

    const navigate = useNavigate()
    const {themes, renameTheme, removeTheme, changeThemeDescription} = useThemesListScope()
    const colors = createMemo(() => {
        return {}
    })

    function rename(newName: string) {
        renameTheme(theme.id, newName)
    }

    function remove() {
        const themeIndex = themes.findIndex(t => t.id === theme.id)
        if (themeIndex === -1) return

        const newTheme = themes[themeIndex + 1] ?? themes[themeIndex - 1]
        removeTheme(theme.id)
        if (newTheme != null) {
            navigate("/editor/" + (newTheme.id))
        } else {
            navigate("/editor")
        }
    }

    function changeDescription(newDescription: string) {
        changeThemeDescription(theme.id, newDescription)
    }
    return {
        theme,
        rename,
        remove,
        changeDescription
    }
})
