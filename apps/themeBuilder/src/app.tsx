import {Navigate, Route, Router} from "@solidjs/router";
import "virtual:uno.css"
import "@web/lins/minimal.css"
import ContactUs from "~/app/contact/ContactUs/ContactUs"
import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import ThemeSettings from "~/app/themes/ThemeEditor/ThemeSettings";
import ColorEditor, {preloadColors} from "~/app/themes/ColorEditor/ColorEditor";
import ElementsEditor from "~/app/elements/ElementsEditor";

export default function App() {
    return (
        <Router
            root={(props: any) => (props.children)}
        >
            <Route path={["/editor", "/"]} component={ThemeEditor}>
                <Route path={"/"}></Route>
                <Route path={"/:themeId?"} component={ThemeSettings}>
                    <Route path={"/"} component={() => <Navigate href={"colors"}/>}/>
                    <Route path={"/colors"} component={ColorEditor} preload={preloadColors}/>
                </Route>
            </Route>
            <Route path={"/editor/:themeId/elements"} component={ElementsEditor}></Route>
            <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
        </Router>
    )
}
