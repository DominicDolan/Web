import {Todo} from "./TodoRepository";
import {useTodoScope} from "./TodoScope";
import {createSignal, Match, Show, Switch} from "solid-js";
import {PartialModel} from "@web/schema";


function EditingTodoItem(props: { todo: PartialModel<Todo>, onSave: (value: string) => void, onCancel: () => void }) {

    const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null)
    function onSubmitted(e: any) {
        e.preventDefault()
        props.onSave(inputRef()?.value ?? "")
    }
    return <form class="flex gap-4" onSubmit={onSubmitted}>
        <input type={"text"} value={props.todo.text} ref={setInputRef}/>
        <input type="submit">Save</input>
        <button onClick={props.onCancel}>Cancel</button>
    </form>
}
export function TodoItem(props: { todo: Todo}) {
    const {markCompleteState, updateTodo} = useTodoScope()

    const [isEditing, setIsEditing] = createSignal(false)

    const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null)
    function onSubmitted(e: any) {
        e.preventDefault()
        updateTodo(props.todo.id, inputRef()?.value ?? "")
        setIsEditing(false)
    }

    return <>
        <div flex="row gap-2">
            <Switch>
                <Match when={isEditing()}>
                    <form class="flex gap-4" onSubmit={onSubmitted}>
                        <input type={"text"} value={props.todo.text} ref={setInputRef}/>
                        <input type="submit">Save</input>
                        <button onClick={() => setIsEditing(false)}>Cancel</button>
                    </form>
                </Match>
                <Match when={!isEditing()}>
                    <input
                        checked={props.todo.completed}
                        type={"checkbox"}
                        onInput={(e) => markCompleteState(props.todo.id, e.target.checked)}/>
                    <div>{props.todo.text}</div>
                    <button onClick={() => setIsEditing(true)}>Edit</button>
                </Match>
            </Switch>
        </div>
    </>
}
