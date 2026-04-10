import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import {Match, Show, Switch} from "solid-js";
import {Navigate, useLocation} from "@web/router";
import ContactUs from "~/app/contact/ContactUs/ContactUs";
import {ThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ColorScope} from "~/app/colors/ColorEditor/ColorScope";
import {ColorEditor} from "~/app/colors/ColorEditor/ColorEditor";

export default function App() {
    const location = useLocation();

    return (
        <div class="minimalTheme light">
            <Switch fallback={<><div>404</div></>}>
                <Match when={location.segments()[0] === "editor" && location.segments()[2] === "colors" && location.segments().length === 4}>
                    <ColorScope themeId={location.segments()[1]} colorId={location.segments()[3]}>
                        <ColorEditor/>
                    </ColorScope>
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
