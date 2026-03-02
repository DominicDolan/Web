import {createAsync, query} from "@solidjs/router";
import {Todo, TodoProvider, useTodoScope} from "~/TodoList/TodoScope";
import {ModelRecord} from "../../../../packages/solidDelta";
import {ModelDelta} from "@web/schema";
import {createId} from "@paralleldrive/cuid2";
import {For, Show, Suspense} from "solid-js";
import {TodoList} from "~/TodoList/TodoList";
import {defineScope} from "@web/solid-scope";
import {TodoItem} from "~/TodoList/TodoItem";
import {NewTodoItem} from "~/TodoList/NewTodoItem";

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
        }, 1000)
    })
}, "get-todos")

export const TodoListPage = () => {

    const todoDeltas = createAsync(() => retrieveTodos(), { deferStream: true })
    return (
        <div>
            <h1>TodoList</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <Show when={todoDeltas() != null}>
                    <TodoProvider deltas={todoDeltas()!!} use={useTodoScope}>{
                        ({todos}) => <>
                            <div flex={"col gap-4"}>
                                <For each={todos}>{(todo) => (
                                    <TodoItem todo={todo}/>
                                )}
                                </For>
                                <NewTodoItem/>
                            </div>
                        </>
                    }</TodoProvider>
                </Show>
            </Suspense>
        </div>
    )
}
