import {useTodoScope} from "~/TodoList/TodoScope";
import {createSignal, For} from "solid-js";
import {TodoItem} from "~/TodoList/TodoItem";

export const TodoList = () => {
    const { todos, addTodo } = useTodoScope()

    const [newTodoText, setNewTodoText] = createSignal<string>("")
    function onAddTodoClicked(e: any) {
        e.preventDefault()
        const text = newTodoText()
        if (text == null || text.trim().length === 0) {
            throw new Error("Todo text cannot be empty")
        }
        addTodo(text)
        setNewTodoText("")
    }
    return (
        <div flex={"col gap-4"}>
            <For each={todos}>{ (todo) => (
                <TodoItem todo={todo}/>
            )}
            </For>
            <form flex={"row gap-2"} onSubmit={onAddTodoClicked}>
                <input value={newTodoText()} required={true} minlength={1} onInput={(e) => setNewTodoText(e.currentTarget.value)}/>
                <input type={"submit"}>Add Todo</input>
            </form>
        </div>
    )
}
