import {useTodoScope} from "~/TodoList/TodoScope";
import {createSignal} from "solid-js";

export const NewTodoItem = () => {
    const { addTodo } = useTodoScope()

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

    return <form flex={"row gap-2"} onSubmit={onAddTodoClicked}>
            <input value={newTodoText()} required={true} minLength={1}
                   onInput={(e) => setNewTodoText(e.currentTarget.value)}/>
            <button type={"submit"}>Add Todo</button>
    </form>
}
