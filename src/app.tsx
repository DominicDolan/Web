import {Navigate, Route, Router} from "@solidjs/router";
import "virtual:uno.css"
import "./style/theme/minimal/theme.css"
import ExportConfig from "~/app/ImportConfig/ExportConfig"
import Home from "~/app/Home/Home"
import ContactUs from "~/app/ContactUs/ContactUs"
import {ModelStoreTestPage} from "~/app/ModelStoreTestPage/ModelStoreTestPage"
import ThemeEditor from "~/app/ThemeEditor/ThemeEditor"
import {AsyncTestPage} from "~/app/AsyncTestPage/AsyncTestPage"
import {ContextStoreTestPage} from "~/app/ContextStoreTestPage/ContextStoreTestPage"
import {DeltaModelContextStoreTest} from "~/app/DeltaModelContextStoreTest/DeltaModelContextStoreTest";
import {ThemeSettings} from "~/app/ThemeEditor/ThemeSettings";
import ColorSettings from "~/app/ThemeEditor/ColorSettings";

export default function App() {

    return (
        <Router
            root={(props: any) => (props.children)}
        >
            <Route path={"/"} component={Home} info={{title: "Home"}}/>
            <Route path={"/export"} component={ExportConfig} info={{title: "Import"}}/>
            <Route path={"/editor"} component={ThemeEditor} info={{title: "Editor"}}>
                <Route path={"/:themeId?"} component={ThemeSettings}>
                    <Route path={"/"} component={() => <Navigate href={"colors"}/>}/>
                    <Route path={"/colors"} component={ColorSettings}/>
                </Route>
            </Route>
            <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
            <Route path={"/test"} component={ModelStoreTestPage} info={{title: "Store Test Page"}}/>
            <Route path={"/test2"} component={AsyncTestPage} info={{title: "Async Test Page"}}/>
            <Route path={"/test3"} component={ContextStoreTestPage} info={{title: "Context Store Test Page"}}/>
            <Route path={"/test4"} component={DeltaModelContextStoreTest} info={{title: "Delta Model Context Store Test Page"}}/>
        </Router>
    )
}
