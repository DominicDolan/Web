import "virtual:uno.css"
import "@web/lins/minimal.css"
import ContactUs from "~/app/contact/ContactUs/ContactUs"
import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import ThemeSettings from "~/app/themes/ThemeEditor/ThemeSettings";
import {lazy} from "solid-js";
import ColorEditor, {preloadColors} from "~/app/themes/ColorEditor/ColorEditor";
import ElementsEditor from "~/app/elements/ElementsEditor";
import {A, Route, Router} from "@web/router";

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

function TestComponent() {
    return <div>Test as '/test'</div>
}

function Home() {
    return <h1>Home</h1>
}

export default function App() {
    return (
        <Router
            root={(props: any) => <><nav flex="row gap-4"><A href="/">Home</A><A href="/test">Test</A><A href="/test-route">Test Again</A></nav><div>{props.children}</div></>}
        >
            <Route path={"/"} component={Home}></Route>
            <Route path={["/test", "/test-route"]} component={TestComponent}></Route>
        </Router>
    )
}
