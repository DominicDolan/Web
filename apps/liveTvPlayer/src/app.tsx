import {createProjection, createSignal, createStore} from "solid-js";
import {Example} from "./Example/Example";

export default function App() {
  const [store, setStore] = createStore({
    count: 0,
  })

  function increment() {
    setStore(() => ({
      count: store.count + 1,
    }))
  }

  const doubleCount = createProjection(() => ({ count: store.count * 2}))
  return (
    <main style={{ "font-family": "system-ui, sans-serif" }}>
      <Example />
    </main>
  );
}
