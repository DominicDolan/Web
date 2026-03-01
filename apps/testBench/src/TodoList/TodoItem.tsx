import {Todo} from "~/TodoList/TodoScope";

export const TodoItem = (props: { todo: Todo }) => {
    return (
        <div>
            <input type="checkbox" checked={props.todo.completed} />
            <p>
                {props.todo.text}
            </p>
        </div>
    )
}
