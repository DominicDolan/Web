import {createAsync, query} from "@solidjs/router";
import {Todo, TodoProvider} from "~/TodoList/TodoScope";
import {ModelRecord} from "@web/delta";
import {ModelDelta} from "@web/schema";
import {createId} from "@paralleldrive/cuid2";
import {Show, Suspense} from "solid-js";
import {TodoList} from "~/TodoList/TodoList";

const retrieveTodos = query(() => {
    return new Promise<ModelRecord<Todo>>((resolve, reject) => {
        setTimeout(() => {
            const deltas: ModelDelta<Todo>[] = [
                {
                    modelId: createId(),
                    payload: {
                        completed: false,
                        text: "Sample Todo",
                    },
                    type: "create",
                    timestamp: Date.now(),
                },
                {
                    modelId: createId(),
                    payload: {
                        completed: false,
                        text: "Sample Todo 2",
                    },
                    type: "create",
                    timestamp: Date.now(),
                },
            ]
            const record: ModelRecord<Todo> = deltas.reduce((acc, delta) => {
                acc[delta.modelId] = [delta];
                return acc;
            }, {} as ModelRecord<Todo>)
            resolve(record)
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
                    <TodoProvider deltas={todos()!!}>
                        <TodoList/>
                    </TodoProvider>
                </Show>
            </Suspense>
        </div>
    )
}
