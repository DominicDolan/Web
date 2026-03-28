import {greet} from "./function";
import { render } from '@solidjs/web';
import {createMemo, Loading} from "solid-js"


export default function App() {

    const greeting = createMemo(() => greet("Cloudflare Voyager"));

    return <main>
        <Loading >
            <h1>{greeting().message}</h1>
            <p>Server Time: {greeting().timestamp}</p>
            <p>Runtime: {greeting().nodeVersion}</p>
        </Loading>
    </main>
}

const app = document.getElementById("app");
if (!app) throw new Error("No app element found");

render(() => <App />, app!);
