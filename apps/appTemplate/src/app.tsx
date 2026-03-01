import "virtual:uno.css";
import {Route, Router} from "@solidjs/router";

export default function App() {
  return (
    <main style={{ padding: "2rem", "font-family": "system-ui, sans-serif" }}>
        <Router root={(props: any) => (props.children)}>
            <Route path={"/"} component={() => <div>Home</div>}/>
        </Router>
    </main>
  );
}
