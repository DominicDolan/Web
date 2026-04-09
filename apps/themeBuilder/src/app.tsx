import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import {Match, Show, Switch} from "solid-js";
import {Navigate, useLocation} from "@web/router";
import ContactUs from "~/app/contact/ContactUs/ContactUs";
import {ThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ColorScope} from "~/app/themes/ColorEditor/ColorScope";
import {ColorEditor} from "~/app/themes/ColorEditor/ColorEditor";

// export default function App() {
//     return (
//         <Router
//             root={(props: any) => <><nav>Nav Bar</nav><div>{props.children}</div></>}
//         >
//             <Route path={["/editor", "/"]} component={ThemeEditor}>
//                 <Route path={"/"}></Route>
//                 <Route path={"/:themeId?"} component={ThemeSettings}>
//                     <Route path={"/"} component={() => <Navigate href={"colors"}/>}/>
//                     <Route path={"/colors"} component={ColorList} preload={preloadColors}/>
//                 </Route>
//             </Route>
//             <Route path={"/editor/:themeId/elements"} component={ElementsEditor}></Route>
//             <Route path={"/editor/:themeId/fonts"} component={lazy(() => import("~/app/themes/FontsEditor/FontsEditor"))}></Route>
//             <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
//         </Router>
//     )
// }
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
