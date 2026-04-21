import {defineScope} from "@web/solid-scope";
import {ThemeScope} from "~/app/themes/ThemeEditor/ThemeScope";


export const useTypographyListScope = defineScope(ThemeScope, (props) => {

    return {
        theme: () => props.theme,
    }
});
