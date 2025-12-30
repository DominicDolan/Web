import styles from "./app.module.css"
import {A, Route, Router} from "@solidjs/router";
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

export default function App() {
    return (
        <Router
            root={(props: any) => (
                <div class={styles.appGrid + " app"} sizing={"w-full h-full"}>
                    <nav grid-area={"nav"} spacing={"py-4 px-6"} flex={"col gap-8"}>
                        <header>
                            <h1>Theme.Build</h1>
                        </header>
                        <div sizing={"w-full"} flex={"col gap-6"}>
                            <button>Add Theme</button>
                            <ul class="nav" flex={"col gap-4"} sizing={"w-full"} spacing={"pl-0"}>
                                <li>
                                    <A href={"/theme/1"} class={"display-block"}>Theme 1</A>
                                </li>
                                <li>
                                    <A href={"/theme/2"} class={"display-block"}>Theme 2</A>
                                </li>
                                <li>
                                    <A href={"/"} class={"display-block"}>Home</A>
                                </li>
                            </ul>
                        </div>
                    </nav>
                    <aside
                        spacing={"py-6 px-6"}
                        grid-area={"menu"}
                        flex={"col center"}>
                        <section sizing={"w-full"} flex={"col gap-4"} spacing={"mb-8"}>
                            <h2 spacing={"mb-2"}>Theme Settings</h2>
                            <form-field flex={"col gap-2"}>
                                <label>Name</label>
                                <input-shell>
                                    <input type={"text"}/>
                                </input-shell>
                            </form-field>
                            <form-field flex={"col gap-2"}>
                                <label>Description</label>
                                <textarea/>
                            </form-field>
                            <form-field flex={"col gap-2"}>
                                <label>Tags</label>
                                <select/>
                            </form-field>
                        </section>
                        <hr sizing={"w-full"}/>
                        <section sizing={"w-full"} flex={"col gap-4"} spacing={"mt-10 mb-8"}>
                            <h2 spacing={"mb-2"}>Edit Theme</h2>
                            <ul class={"plain"} flex={"col"}>
                                <li flex={"row space-between"}>
                                    <A href={"/editor"}>Edit Colors</A>
                                    <i>keyboard_arrow_right</i>
                                </li>
                                <li flex={"row space-between"}>
                                    <A href={"/editor2"}>Edit Fonts</A>
                                    <i>keyboard_arrow_right</i>
                                </li>
                                <li flex={"row space-between"}>
                                    <A href={"/editor3"}>Edit Elements</A>
                                    <i>keyboard_arrow_right</i>
                                </li>
                            </ul>
                        </section>
                    </aside>
                    <main grid-area={"content"}
                          sizing={"h-full min-w-200 max-w-400 w-70%"}
                          spacing={"pa-8 pt-16 ma-auto"} >
                        {props.children}
                    </main>
                </div>

            )}
        >
            <Route path={"/"} component={Home} info={{title: "Home", filesystem: true}}/>
            <Route path={"/export"} component={ExportConfig} info={{title: "Import"}}/>
            <Route path={"/editor"} component={ThemeEditor} info={{title: "Editor"}}/>
            <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
            <Route path={"/test"} component={ModelStoreTestPage} info={{title: "Store Test Page"}}/>
            <Route path={"/test2"} component={AsyncTestPage} info={{title: "Async Test Page"}}/>
            <Route path={"/test3"} component={ContextStoreTestPage} info={{title: "Context Store Test Page"}}/>
            <Route path={"/test4"} component={DeltaModelContextStoreTest} info={{title: "Delta Model Context Store Test Page"}}/>
        </Router>
    )
}
