import { render } from '@solidjs/web';
import {UserScope} from "./TodoList/TodoScope";
import {TodoList} from "./TodoList/TodoList";

export default function App() {
  return (
    <main style={{ padding: "2rem", "font-family": "system-ui, sans-serif" }}>
        Solid2 Example
        <UserScope userId={"some-id"}>
            <TodoList />
        </UserScope>
    </main>
  );
}

const root = document.getElementById('root');

render(() => <App />, root!);
