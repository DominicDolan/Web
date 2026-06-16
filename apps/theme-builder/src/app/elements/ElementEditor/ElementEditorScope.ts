import {createScopeProvider, defineScope} from "@web/solid-scope";

export const ElementEditorScope = createScopeProvider<{
    themeId: string
    elementType: string
}>()

export const useElementEditorScope = defineScope(ElementEditorScope, (props) => {

    return {

    }
})
