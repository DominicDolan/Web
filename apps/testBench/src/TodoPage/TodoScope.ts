import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createMemo, storePath} from "solid-js";
import {retrieveTodos} from "./TodoRepository";
import {createDeltaStore} from "@web/solid-delta";

export const UserScope = createScopeProvider<{ userId: string }>()

export const useTodoScope = defineScope(UserScope, (props) => {

    const getTodos = createMemo(() => retrieveTodos())

    const [todos, setTodos] = createDeltaStore(getTodos)

    function markCompleteState(id: string, completed: boolean) {
        setTodos(storePath(id, "completed", completed))
    }

    function updateTodo(id: string, text: string) {
        setTodos(storePath(id, "text", text))
    }
    return {
        todos,
        markCompleteState,
        updateTodo,
    }
})
