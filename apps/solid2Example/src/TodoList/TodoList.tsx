import {For, Loading} from "solid-js";
import {useTodoScope} from "./TodoScope";

export const TodoList = () => {

    const {todos} = useTodoScope()
    return (
        <div>
            <h1>TodoList</h1>
            <Loading fallback={<div>Loading...</div>}>
                <div>
                    <For each={todos}>{todo => <div>todo()</div>}</For>
                </div>
            </Loading>
        </div>
    )
}

