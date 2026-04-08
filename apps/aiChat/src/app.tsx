import {marked} from "marked";
import markedKatex from "marked-katex-extension";
import {Chat} from "~/Chat/Chat";


marked.use(markedKatex({
  throwOnError: false,
  displayMode: true,
  nonStandard: true,
}));

export function App() {
  return <Chat />
}
