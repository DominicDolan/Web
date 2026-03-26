
import {createMemo, For, Loading, refresh} from "solid-js";
import {retrieveTodos, writeTodo} from "../mock/Todos";
import {createDeltaStore} from "@web/solid-delta";
import {TodoItem} from "./TodoItem";

export const TodoList = () => {

    const deltas = createMemo(() => retrieveTodos())

    const [todos, setTodos] = createDeltaStore(deltas)

    function appendDelta() {
        writeTodo({
            id: "some-id-1",
            path: ["completed"],
            value: true,
            timestamp: Date.now()
        })
        setTimeout(() => {
            refresh(deltas)
        })
    }
    return (
        <div>
            <h1>TodoList</h1>
            <Loading fallback={<div>Loading...</div>}>
                <div class="flex flex-col gap-4 max-w-150">
                    <For each={todos}>{todo => <TodoItem todo={todo()} setTodos={setTodos}/> }</For>
                </div>
                <div class={"flex flex-row gap-2"}>
                    <button onClick={() => appendDelta()}>Append</button>
                </div>
            </Loading>
        </div>
    )
}

