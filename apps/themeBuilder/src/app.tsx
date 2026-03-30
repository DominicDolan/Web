import "virtual:uno.css"
import "@web/lins/minimal.css"
import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import {lazy, Loading, Match, Show, Switch} from "solid-js";
import {Navigate, useLocation} from "@web/router";
import ContactUs from "~/app/contact/ContactUs/ContactUs";

// export default function App() {
//     return (
//         <Router
//             root={(props: any) => <><nav>Nav Bar</nav><div>{props.children}</div></>}
//         >
//             <Route path={["/editor", "/"]} component={ThemeEditor}>
//                 <Route path={"/"}></Route>
//                 <Route path={"/:themeId?"} component={ThemeSettings}>
//                     <Route path={"/"} component={() => <Navigate href={"colors"}/>}/>
//                     <Route path={"/colors"} component={ColorEditor} preload={preloadColors}/>
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
                <Match when={location.path() === "/" || location.segments()[0] === "editor"}>
                    <Show when={location.path() === "/"}>
                        <Navigate to="/editor"/>
                    </Show>
                    <ThemeEditor></ThemeEditor>
                </Match>
                <Match when={location.segments()[0] === "contactus"}>
                    <ContactUs/>
                </Match>
            </Switch>

        </div>
    )
}
