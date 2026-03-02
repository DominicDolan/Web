import {createScopeProvider} from "@web/solid-scope";
import {defineDeltaScope, ModelRecord} from "@web/solid-delta";

export type Todo = {
    id: string;
    updatedAt: number;
    text: string;
    completed: boolean;
}

export const TodoProvider = createScopeProvider<{ deltas: ModelRecord<Todo> }>()

export const useTodoScope = defineDeltaScope(TodoProvider, ({push, store, models}) => {

    function getTodoById(id: string) {
        return store.getModelById(id)
    }

    function addTodo(text: string) {
        push("create", {
            text,
            completed: false,
        })
    }

    function markCompleteState(id: string, completed: boolean) {
        push(id, { completed })
    }

    function removeTodo(id: string) {
        push("delete", id)
    }

    return {
        todos: models,
        getTodoById,
        addTodo,
        markCompleteState,
        removeTodo
    }
})

