import {Todo, useTodoScope} from "~/TodoList/TodoScope";

export const TodoItem = (props: { todo: Todo }) => {
    const {markCompleteState, removeTodo} = useTodoScope()

    function onCompletedChanged(e: any) {
        markCompleteState(props.todo.id, e.target.checked)
    }

    function onDeleteClicked(e: any) {
        removeTodo(props.todo.id)
    }

    return (
        <div flex={"row gap-4"}>
            <input id={props.todo.id} type="checkbox" checked={props.todo.completed} onChange={onCompletedChanged}/>
            <label for={props.todo.id}>{props.todo.text}</label>
            <button onClick={onDeleteClicked}>Delete</button>
        </div>
    )
}
