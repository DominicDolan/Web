import {Todo} from "~/TodoList/TodoScope";
import {createAsync, query} from "@solidjs/router";
import {createId} from "@paralleldrive/cuid2";
import {For, Show, Suspense} from "solid-js";
import {TodoProviderNoDelta, useTodoScopeNoDelta} from "~/TodoListNoDelta/TodoScopeNoDelta";
import {TodoItemNoDelta} from "~/TodoListNoDelta/TodoItemNoDelta";
import {NewTodoItemNoDelta} from "~/TodoListNoDelta/NewTodoItemNoDelta";

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
}, "get-todos-nodeltas")

export default () => {

    const todos = createAsync(() => retrieveTodos(), { deferStream: true })

    return (
        <div>
            <h1>TodoList</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <Show when={todos()}>{(t) => <TodoProviderNoDelta todos={t()} use={useTodoScopeNoDelta}>{
                        ({todos}) => <>
                            <div flex={"col gap-4"}>
                                <For each={todos}>{(todo) => (
                                    <TodoItemNoDelta todo={todo}/>
                                )}
                                </For>
                                <NewTodoItemNoDelta/>
                            </div>
                        </>
                    }</TodoProviderNoDelta>}
                </Show>
            </Suspense>
        </div>
    )
}
