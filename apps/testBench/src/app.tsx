import "virtual:uno.css";
import {Router, Route, A} from "@solidjs/router";
import {lazy, Suspense} from "solid-js";

export default function App() {
    return (
        <main style={{padding: "2rem", "font-family": "system-ui, sans-serif"}}>
            <Router root={(props: any) => <div><div flex={"row gap-4"}>
                <h1>New App</h1>
                <A href={"/todo-delta"}>Todo With Delta</A>
                <A href={"/todo-nodelta"}>Todo Without Delta</A>
                <A href={"/test"}>Test Page</A>
            </div>
                <Suspense>
                    {props.children}
                </Suspense>
            </div>}>
                <Route path={"/todo-delta"} component={lazy(() => import("~/TodoList/TodoList"))}/>
                <Route path={"/todo-nodelta"} component={lazy(() => import("~/TodoListNoDelta/TodoListNoDelta"))}/>
                <Route path={"/test"} component={() => <div>Test Page Content</div>}/>
            </Router>
        </main>
    );
}
