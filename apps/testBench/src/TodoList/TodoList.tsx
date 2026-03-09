import {createAsync, query} from "@solidjs/router";
import {Todo, TodoProvider, useTodoScope} from "~/TodoList/TodoScope";
import {ModelRecord} from "@web/solid-delta";
import {ModelDelta} from "@web/schema";
import {createId} from "@paralleldrive/cuid2";
import {For, Show, Suspense} from "solid-js";
import {TodoItem} from "~/TodoList/TodoItem";
import {NewTodoItem} from "~/TodoList/NewTodoItem";

const retrieveTodos = query(() => {
    "use server"
    return new Promise<ModelRecord<Todo>>((resolve, reject) => {
        setTimeout(() => {
            const deltas: ModelDelta<Todo>[] = [
                {
                    modelId: "model-1",
                    payload: {
                        completed: false,
                        text: "Sample Todo",
                    },
                    type: "create",
                    timestamp: new Date("2026-05-03").getTime(),
                },
                {
                    modelId: "model-2",
                    payload: {
                        completed: false,
                        text: "Sample Todo 2",
                    },
                    type: "create",
                    timestamp: new Date("2026-05-03").getTime(),
                },
            ]
            const record: ModelRecord<Todo> = deltas.reduce((acc, delta) => {
                acc[delta.modelId] = [delta];
                return acc;
            }, {} as ModelRecord<Todo>)
            resolve(record)
        }, 1000)
    })
}, "get-todos")

export default () => {

    const todoDeltas = createAsync(() => retrieveTodos(), { deferStream: true })
    return (
        <div>
            <h1>TodoList</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <Show when={todoDeltas()}>{(td) => <TodoProvider deltas={td()} use={useTodoScope}>{
                        ({todos}) => <>
                            <div flex={"col gap-4"}>
                                <For each={todos}>{(todo) => (
                                    <TodoItem todo={todo}/>
                                )}
                                </For>
                                <NewTodoItem/>
                            </div>
                        </>
                    }</TodoProvider>}
                </Show>
            </Suspense>
        </div>
    )
}
