import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createMemo, storePath} from "solid-js";
import {createDeltaStore} from "@web/solid-delta";
import {retrieveTodos} from "~/TodoPage/TodoRepository.server";

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
        addTodo
    }
})
