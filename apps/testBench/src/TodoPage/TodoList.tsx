import {For, Loading} from "solid-js";
import {useTodoScope} from "./TodoScope";
import {TodoItem} from "~/TodoPage/TodoItem";


export function TodoList() {

    const {todos} = useTodoScope()

    return <div flex="col gap-2">
        <Loading fallback={<div>Loading...</div>}>
            <For each={todos}>{ todo => <>
                <TodoItem todo={todo()}/>
            </>}</For>
        </Loading>
    </div>
}
