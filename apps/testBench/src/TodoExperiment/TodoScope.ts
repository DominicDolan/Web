import {createScopeProvider, defineScope} from "@web/solid-scope";
import {createAsync, createAsyncStore, query} from "@solidjs/router";
import {createId} from "@paralleldrive/cuid2";
import {createStore} from "solid-js/store";

export type Todo = {
    id: string;
    updatedAt: number;
    text: string;
    completed: boolean;
}

export const UserScope = createScopeProvider<{ userId: string }>()


const retrieveTodos = query(() => {
    return new Promise<Todo[]>((resolve, reject) => {
        setTimeout(() => {
            const todos: Todo[] = [
                {
                    id: createId(),
                    completed: false,
                    text: "Sample Todo No Delta",
                    updatedAt: Date.now()
                },
                {
                    id: createId(),
                    completed: false,
                    text: "Sample Todo No Delta 2",
                    updatedAt: Date.now()
                },
            ]

            resolve(todos)
        }, 1000)
    })
}, "get-todos-experiement")


export const useTodoScope = defineScope(UserScope, (props) => {
    const todos = createAsyncStore(() => retrieveTodos())

    const [todoStore, setTodoStore] = createStore(todos() ?? [])

    return {
        todos: todoStore,
    }
})
