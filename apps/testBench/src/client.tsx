import { render } from '@solidjs/web';
import {TodoPage} from "./TodoPage/TodoPage";
import "virtual:uno.css";


export default function App() {
    return <main>
        <TodoPage/>
    </main>
}

const app = document.getElementById("app");
if (!app) throw new Error("No app element found");

render(() => <App />, app!);
