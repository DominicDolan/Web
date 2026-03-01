import {Todo, useTodoScope} from "~/TodoList/TodoScope";

export const TodoItem = (props: { todo: Todo }) => {
    const {markCompleteState} = useTodoScope()

    function onCompletedChanged(e: any) {
        markCompleteState(props.todo.id, e.target.checked)
    }

    return (
        <div>
            <input type="checkbox" checked={props.todo.completed} onChange={onCompletedChanged}/>
            <p>
                {props.todo.text}
            </p>
        </div>
    )
}
