import {Navigate, Route, Router} from "@solidjs/router";
import "virtual:uno.css"
import "@web/lins/minimal.css"
import ContactUs from "~/app/contact/ContactUs/ContactUs"
import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import ThemeSettings from "~/app/themes/ThemeEditor/ThemeSettings";
import ColorEditor from "~/app/themes/ColorEditor/ColorEditor";

export default function App() {
    return (
        <Router
            root={(props: any) => (props.children)}
        >
            <Route path={["/editor", "/"]} component={ThemeEditor} info={{title: "Editor"}}>
                <Route path={"/"}></Route>
                <Route path={"/:themeId?"} component={ThemeSettings}>
                    <Route path={"/"} component={() => <Navigate href={"colors"}/>}/>
                    <Route path={"/colors"} component={ColorEditor}/>
                </Route>
            </Route>
            <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
        </Router>
    )
}
