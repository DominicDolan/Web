import {createAsync, query} from "@solidjs/router";
import {createId} from "@paralleldrive/cuid2";
import {For, Show, Suspense} from "solid-js";
import {Todo, UserScope, useTodoScope} from "~/TodoExperiment/TodoScope";
import {TodoItem} from "~/TodoExperiment/TodoItem";

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

const TodoList = () => {

    const {todos} = useTodoScope()
    return (
        <div>
            <h1>TodoList</h1>
            <Suspense fallback={<div>Loading...</div>}>
                <div flex={"col gap-4"}>
                    <For each={todos}>{todo => <TodoItem todo={todo}/>}</For>
                </div>
            </Suspense>
        </div>
    )
}

export default () => {
    return <UserScope userId={"some-id"}>
        <TodoList/>
    </UserScope>
}
