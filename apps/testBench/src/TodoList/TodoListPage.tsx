import {createAsync, query} from "@solidjs/router";
import {Todo, TodoProvider} from "~/TodoList/TodoScope";
import {createId} from "@paralleldrive/cuid2";
import {Show, Suspense} from "solid-js";
import {TodoList} from "~/TodoList/TodoList";

const retrieveTodos = query(() => {
    return new Promise<Todo[]>((resolve, reject) => {
        setTimeout(() => {
            resolve([
                {
                    id: createId(),
                    text: "Sample Todo",
                    completed: false,
                },
                {
                    id: createId(),
                    text: "Sample Todo 2",
                    completed: true,
                },
            ])
        })
    })
}, "get-todos")


export const TodoListPage = () => {

    const todos = createAsync(() => retrieveTodos())
    return (
        <div>
            <h1>TodoList</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <Show when={todos() != null}>
                    <TodoProvider todos={todos()}>
                        <TodoList/>
                    </TodoProvider>
                </Show>
            </Suspense>
        </div>
    )
}
