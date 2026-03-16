import {createProjection, createSignal, createStore} from "solid-js";

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
    <main style={{ padding: "2rem", "font-family": "system-ui, sans-serif" }}>
      <button onClick={increment}>Increment</button>
      <div>{doubleCount.count}</div>
    </main>
  );
}
