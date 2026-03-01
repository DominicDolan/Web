import {useTodoScope} from "~/TodoList/TodoScope";
import {For} from "solid-js";
import {TodoItem} from "~/TodoList/TodoItem";

export const TodoList = () => {
    const { todos } = useTodoScope()
    return (
        <For each={todos}>{ (todo) => (
            <TodoItem todo={todo}/>
        )}
        </For>
    )
}
