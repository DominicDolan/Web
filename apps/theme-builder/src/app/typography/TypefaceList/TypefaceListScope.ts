import {defineScope} from "@web/solid-scope";
import {ThemeScope} from "~/app/themes/ThemeEditor/ThemeScope";
import {createMemo} from "solid-js";
import {getTypefacesForTheme} from "~/app/typography/TypefaceRepository.server";
import {createModels} from "@web/solid-delta";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";
import {defaultTypefacesQueryObject} from "~/constants/DefaultTypefaces";


export const useTypefaceListScope = defineScope(ThemeScope, (props) => {

    const typefaceDeltas = createMemo(() => getTypefacesForTheme(props.theme.id))

    const [typefaces] = createModels(typefaceDeltas)

    function getCssOrDefault(role: TypefaceRole, type: TypefaceType) {
        const typeface = typefaces.find(t => t.role === role && t.type === type)

        const mainCss = typeface?.css ?? defaultTypefacesQueryObject[role][type].css
        const sizeCss = typeface?.mediumCss ?? defaultTypefacesQueryObject[role][type].mediumCss

        return `${mainCss} ${sizeCss}`
    }

    return {
        theme: () => props.theme,
        typefaces: () => typefaces,
        getCssOrDefault
    }
});
