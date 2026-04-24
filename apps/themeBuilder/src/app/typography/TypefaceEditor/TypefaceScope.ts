import {createScopeProvider, defineScope} from "@web/solid-scope";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";
import {createMemo} from "solid-js";
import {getSingleTypefaceDeltas} from "~/app/typography/TypefaceRepository.server";
import {createDeltaStore} from "@web/solid-delta";
import {defaultTypefaces, defaultTypefacesQueryObject} from "~/constants/DefaultTypefaces";

export const TypefaceScope = createScopeProvider<{
    themeId: string,
    role: TypefaceRole,
    size: TypefaceSize,
    type: TypefaceType
}>()

export const useTypefaceScope = defineScope(TypefaceScope, (props) => {

    const typefaceDeltas = createMemo(() => getSingleTypefaceDeltas(props.themeId, props.role, props.size, props.type))

    const defaultTypeface = createMemo(() => defaultTypefacesQueryObject[props.role][props.type][props.size])
    const [typefaces, setTypeface] = createDeltaStore(() => typefaceDeltas())

    const getCssOrDefault = () => typefaces[0]?.css ?? defaultTypeface().css

    return {
        themeId: () => props.themeId,
        role: () => props.role,
        size: () => props.size,
        type: () => props.type,
        typeface: () => typefaces[0],
        getCssOrDefault
    }
})
