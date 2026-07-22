import {createScopeProvider, defineScope} from "@web/solid-scope";
import {
    createEffect,
    createStore,
    refresh,
    snapshot,
} from "solid-js";
import {createModels} from "@web/solid-delta";
import {retrieveTodos, writeTodo} from "~/TodoPage/TodoRepository.server";

export const UserScope = createScopeProvider<{ userId: string }>()

export const useTodoScope = defineScope(UserScope, (props) => {

    const [getTodos, setTodoDeltas] = createStore(() => retrieveTodos(), [])

    const [todos, createDeltas] = createModels(() => getTodos)

    const markCompleteState = async function (id: string, value: boolean) {
        const deltas = createDeltas(id, {completed: value})
        setTodoDeltas(store => {
            store.push(...deltas)
        })
        await writeTodo(deltas)

        refresh(getTodos)
    }

    const updateTodo = async function (id: string, text: string) {
        const deltas = createDeltas(id, {
            text
        })
        setTodoDeltas(store => {
            store.push(...deltas)
        })
        await writeTodo(deltas)

        refresh(getTodos)
    }

    function addTodo(text: string) {
        const deltas = createDeltas("create", {
            text, completed: false,
            user: {
                name: "Unknown"
            }
        })
        setTodoDeltas((draft) => {
            draft.push(...deltas)
        })
    }

    return {
        todos,
        markCompleteState,
        updateTodo,
        addTodo, getTodos
    }
})
