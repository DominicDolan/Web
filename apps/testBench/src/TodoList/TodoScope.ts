import {createScopeProvider, defineDeltaScope, ModelRecord} from "../../../../packages/solidDelta";

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

    function markCompleteState(id: string, complete: boolean) {
        push(id, { complete })
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

