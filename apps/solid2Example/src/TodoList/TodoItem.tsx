import {createSignal, Show, storePath, StoreSetter} from "solid-js";
import {PartialModel} from "@web/schema";
import {Todo} from "../mock/Todos";
import {SetModels} from "@web/solid-delta";


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

export const TodoItem = (props: {todo: PartialModel<Todo>, setTodos: SetModels<Todo>}) => {

    const [isEditing, setIsEditing] = createSignal(false)

    function onValueEdited(value: string) {
        props.setTodos(storePath(props.todo.id, "text", value))
        setIsEditing(false);
    }

    return <>
        <Show when={!isEditing()} fallback={<EditingTodoItem todo={props.todo} onSave={onValueEdited} onCancel={() => setIsEditing(false)}/>}>
            <div class="flex justify-between gap-2 w-full">
                <div class="flex items-center gap-4">
                    <input type={"checkbox"} checked={props.todo.completed}/>
                    <p>{props.todo.text}</p>
                </div>
                <div class="flex gap-4">
                    <button onClick={() => setIsEditing(true)}>Edit</button>
                    <button>Delete</button>
                </div>
            </div>
        </Show>
    </>;
}
