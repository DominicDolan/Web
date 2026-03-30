import {createScopeProvider, defineScope} from "@web/solid-scope";


export const ThemeScope = createScopeProvider<{
    themeId: string | undefined
}>()

export const useThemeScope = defineScope(ThemeScope, ({ themeId }) => {


})
