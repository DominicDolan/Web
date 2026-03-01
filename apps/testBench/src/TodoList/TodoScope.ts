import {createScopeProvider, defineScope} from "@web/delta";
import {createStore} from "solid-js/store";
import {createId} from "@paralleldrive/cuid2"

export type Todo = {
    id: string;
    text: string;
    completed: boolean;
}

export const TodoProvider = createScopeProvider<{ todos?: Todo[] }>()

export const useTodoScope = defineScope(TodoProvider, (props) => {

    const [todos, setTodos] = createStore(props.todos ?? [])

    function getTodoById(id: string) {
        return todos.find(todo => todo.id === id)
    }

    function addTodo(text: string) {
        setTodos(todos.length, {
            id: createId(),
            text,
            completed: false,
        })
    }

    function markCompleteState(id: string, complete: boolean) {
        setTodos(todos.findIndex(todo => todo.id === id), "completed", complete)
    }

    return {
        todos,
        getTodoById,
        addTodo,
        markCompleteState
    }
})

