import {Todo, useTodoScope} from "~/TodoExperiment/TodoScope";
import {createSignal, Match, Show, Switch} from "solid-js";

function EditingTodoItem(props: { todo: Todo, onSave: (value: string) => void, onCancel: () => void }) {

    function onSaveClicked(e: any) {
        e.preventDefault()
        props.onSave(e.target.value)
    }
    return <form flex="row gap-4">
        <input type={"text"} value={props.todo.text}/>
        <input type="submit" onClick={onSaveClicked}>Save</input>
        <button onClick={props.onCancel}>Cancel</button>
    </form>
}
export const TodoItem = (props: {todo: Todo}) => {

    const [isEditing, setIsEditing] = createSignal(false)
    const {} = useTodoScope()
    function onValueEdited(value: string) {

        setIsEditing(false);
    }

    return <>
        <Show when={!isEditing()} fallback={<EditingTodoItem todo={props.todo} onSave={onValueEdited} onCancel={() => setIsEditing(false)}/>}>
            <div flex="row gap-4">
                <p>{props.todo.text}</p>
                <input type={"checkbox"} checked={props.todo.completed}/>
                <button onClick={() => setIsEditing(true)}>Edit</button>
                <button>Delete</button>
            </div>
        </Show>
    </>;
}
