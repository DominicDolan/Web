import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import {Match, Show, Switch} from "solid-js";
import {Navigate, useLocation} from "@web/router";
import ContactUs from "~/app/contact/ContactUs/ContactUs";
import {ThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {TypefaceRole, typefaceRoles, TypefaceType} from "~/constants/TypefaceRoles";
import {ColorScope} from "~/app/colors/ColorEditor/ColorScope.ts";
import {ColorEditor} from "~/app/colors/ColorEditor/ColorEditor.tsx";
import {TypefaceEditor} from "~/app/typography/TypefaceEditor/TypefaceEditor.tsx";
import {TypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope.ts";
import {ElementEditorScope} from "~/app/elements/ElementEditor/ElementEditorScope.ts";
import {ElementEditor} from "~/app/elements/ElementEditor/ElementEditor.tsx";
import {elementCategories} from "~/app/elements/elementCategories.ts";

export default function App() {
    const location = useLocation();

    function matchesTypographyPath() {
        const segments = location.segments()
        const hasRole = segments[3] != null && typefaceRoles.includes(segments[3].toLowerCase() as any)
        const hasType = segments[4] != null && (segments[4] === "variant" || segments[4] === "default")

        return segments[0] === "editor" && segments[2] === "typography" && hasRole && hasType;
    }

    const categories = elementCategories.map(category => category.type)

    function matchesElementPath() {
        return location.segments()[2] === "elements" && location.segments().length === 4 && categories.includes(location.segments()[3])
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
                        type={location.segments()[5] == null ? "default" : location.segments()[5] as TypefaceType}>
                        <TypefaceEditor/>
                    </TypefaceScope>
                </Match>
                <Match when={matchesElementPath()}>
                    <ElementEditorScope themeId={location.segments()[1]} elementType={location.segments()[3]}>
                        <ElementEditor />
                    </ElementEditorScope>
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
