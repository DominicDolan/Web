import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import {Match, Show, Switch} from "solid-js";
import {Navigate, useLocation} from "@web/router";
import ContactUs from "~/app/contact/ContactUs/ContactUs";
import {ThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ColorScope} from "~/app/colors/ColorEditor/ColorScope";
import {ColorEditor} from "~/app/colors/ColorEditor/ColorEditor";
import {TypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope";
import {TypefaceEditor} from "~/app/typography/TypefaceEditor/TypefaceEditor";
import {TypefaceRole, typefaceRoles, TypefaceSize, typefaceSizes, TypefaceType} from "~/constants/TypefaceRoles";

export default function App() {
    const location = useLocation();

    function matchesTypographyPath() {
        const segments = location.segments()
        const hasRole = segments[3] != null && typefaceRoles.includes(segments[3].toLowerCase() as any)
        const hasSize = segments[4] != null && typefaceSizes.includes(segments[4].toLowerCase() as any)
        const hasType = segments[5] == null || segments[5] === "variant" || segments[5] === "default"

        return segments[0] === "editor" && segments[2] === "typography" && hasRole && hasSize && hasType;
    }

    return (
        <div class="minimalTheme light h-full">
            <Switch fallback={<><div>404</div></>}>
                <Match when={location.segments()[0] === "editor" && location.segments()[2] === "colors" && location.segments().length === 4}>
                    <ColorScope themeId={location.segments()[1]} colorId={location.segments()[3]}>
                        <ColorEditor/>
                    </ColorScope>
                </Match>
                <Match when={matchesTypographyPath()}>
                    <TypefaceScope
                        themeId={location.segments()[1]}
                        role={location.segments()[3] as TypefaceRole}
                        size={location.segments()[4] as TypefaceSize}
                        type={location.segments()[5] == null ? "default" : location.segments()[5] as TypefaceType}>
                        <TypefaceEditor/>
                    </TypefaceScope>
                </Match>
                <Match when={location.path() === "/" || location.segments()[0] === "editor"}>
                    <Show when={location.path() === "/"}>
                        <Navigate to="/editor"/>
                    </Show>
                    <ThemesListScope>
                        <ThemeEditor/>
                    </ThemesListScope>
                </Match>
                <Match when={location.segments()[0] === "contactus"}>
                    <ContactUs/>
                </Match>
            </Switch>

        </div>
    )
}
