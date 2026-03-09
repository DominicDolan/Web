import {Todo} from "~/TodoList/TodoScope";
import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createStore} from "solid-js/store";
import {createId} from "@paralleldrive/cuid2";

console.log("creating no delta scope")
export const TodoProviderNoDelta = createScopeProvider<{ todos: Todo[] }>()

export const useTodoScopeNoDelta = defineScope(TodoProviderNoDelta, (props) => {

    if (props.todos == null || props.todos.length === 0) {
        throw new Error("No todos provided")
    }
    const [todoStore, setTodoStore] = createStore(props.todos)
    function getTodoById(id: string) {
        return props.todos.find(t => t.id === id)
    }

    function addTodo(text: string) {
        setTodoStore(todoStore.length, {
            id: createId(),
            updatedAt: Date.now(),
            text,
            completed: false,
        })
    }

    function markCompleteState(id: string, completed: boolean) {
        const index = todoStore.findIndex(t => t.id === id)
        setTodoStore(index, { completed })
    }

    function removeTodo(id: string) {
        setTodoStore((arr) => arr.filter(t => t.id !== id))
    }

    return {
        todos: todoStore,
        getTodoById,
        addTodo,
        markCompleteState,
        removeTodo
    }
})
