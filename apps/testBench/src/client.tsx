import { render } from '@solidjs/web';
import {TodoPage} from "./TodoPage/TodoPage";
import {ProjectionTest} from "~/ProjectionTest.tsx";


export default function App() {
    return <main>
        <ProjectionTest/>
    </main>
}

const app = document.getElementById("app");
if (!app) throw new Error("No app element found");

render(() => <App />, app!);
