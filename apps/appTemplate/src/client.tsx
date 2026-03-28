import { render } from '@solidjs/web';
import "virtual:uno.css";


export default function App() {
    return <main>
        App Template
    </main>
}

const app = document.getElementById("app");
if (!app) throw new Error("No app element found");

render(() => <App />, app);
