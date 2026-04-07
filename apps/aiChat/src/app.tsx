import {createMemo, Loading} from "solid-js";
import {getGreeting} from "~/Gemma4Service";


export function App() {

    const greeting = createMemo(() => getGreeting())

    return <div>Hello World, <Loading fallback={"Loading..."}>{greeting()}</Loading></div>
}
