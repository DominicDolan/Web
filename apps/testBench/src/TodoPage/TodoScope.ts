import {createScopeProvider, defineScope} from "@web/solid-scope";
import {action, createMemo, createOptimisticStore, refresh, storePath} from "solid-js";
import {createDeltaStore, ModelDelta} from "@web/solid-delta";
import {retrieveTodos, Todo, writeTodo} from "~/TodoPage/TodoRepository.server";

export const UserScope = createScopeProvider<{ userId: string }>()

export const useTodoScope = defineScope(UserScope, (props) => {

    const [getTodos, setOptimisticTodos] = createOptimisticStore(() => retrieveTodos(), [])

    const [todos, setTodos] = createDeltaStore(() => getTodos)

    const markCompleteState = action(function* (id: string, value: boolean) {
        // const deltas = setTodos(storePath(id, "text", text))
        const delta: ModelDelta<Todo> = {id, path: "completed", value, timestamp: Date.now()}
        setOptimisticTodos(store => {
            store.push(delta)
        })
        yield writeTodo(delta)

        refresh(getTodos)
    })

    const updateTodo = action(function* (id: string, text: string) {
        // const deltas = setTodos(storePath(id, "text", text))
        const delta: ModelDelta<Todo> = {id, path: "text", value: text, timestamp: Date.now()}
        setOptimisticTodos(store => {
            store.push(delta)
        })
        yield writeTodo(delta)

        refresh(getTodos)
    })

    function addTodo(text: string) {
        setTodos((draft) => {
            const newId = "some-new-id"
            draft[newId] = {text, completed: false}
        })
    }

    return {
        todos,
        markCompleteState,
        updateTodo,
        addTodo, getTodos
    }
})
