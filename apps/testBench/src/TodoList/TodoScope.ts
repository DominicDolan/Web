import {createScopeProvider} from "@web/solid-scope";
import {defineDeltaScope, ModelRecord, squashDeltasToSingle} from "@web/solid-delta";
import {action, useAction} from "@solidjs/router";
import {ModelDelta} from "@web/schema";

export type Todo = {
    id: string;
    updatedAt: number;
    text: string;
    completed: boolean;
}

const saveTodoAction = action(async (todoDelta: ModelDelta<Todo>) => {
    console.log("Saving todo delta:", todoDelta)
})

export const TodoProvider = createScopeProvider<{ deltas: ModelRecord<Todo> }>()

export const useTodoScope = defineDeltaScope(TodoProvider, ({push, models, getModelById, on}) => {

    const saveTodo = useAction(saveTodoAction)

    on.newDeltaPush(deltas => {
        const delta = squashDeltasToSingle(deltas)
        if (delta == null) return

        saveTodo(delta)
    })

    function getTodoById(id: string) {
        return getModelById(id)
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

