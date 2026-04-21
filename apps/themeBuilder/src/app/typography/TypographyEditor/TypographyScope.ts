import {createScopeProvider, defineScope} from "@web/solid-scope";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";

export const TypographyScope = createScopeProvider<{
    themeId: string,
    role: TypefaceRole,
    size: TypefaceSize,
    type: TypefaceType
}>()

export const useTypographyScope = defineScope(TypographyScope, (props) => {

    return {
        themeId: () => props.themeId,
        role: () => props.role,
        size: () => props.size,
        type: () => props.type
    }
})
