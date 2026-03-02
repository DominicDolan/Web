import "virtual:uno.css";
import {Router, Route} from "@solidjs/router";
import {TodoListPage} from "~/TodoList/TodoListPage";

export default function App() {
  return (
    <main style={{ padding: "2rem", "font-family": "system-ui, sans-serif" }}>
      <h1>New App</h1>
        <Router root={(props: any) => (props.children)}>
            <Route path={"/"} component={TodoListPage}/>
        </Router>
    </main>
  );
}
