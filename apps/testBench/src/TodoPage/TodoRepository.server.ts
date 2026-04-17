"use server"

import {ModelDelta} from "@web/solid-delta";

export type Todo = {
    id: string;
    updatedAt: number;
    text: string;
    completed: boolean;
    user: {
        name: string
    }
}

export const databaseTodos: ModelDelta<Todo>[] = [
    {
        id: "some-id-1",
        path: "completed",
        value: false,
        timestamp: 100
    },
    {
        id: "some-id-1",
        path: "text",
        value: "Sample Todo 1",
        timestamp: 100
    },
    {
        id: "some-id-1",
        path: "user.name",
        value: "John Doe",
        timestamp: 100
    },
    {
        id: "some-id-2",
        path: "completed",
        value: false,
        timestamp: 200,
    },
    {
        id: "some-id-2",
        path: "completed",
        value: true,
        timestamp: 250
    },
    {
        id: "some-id-2",
        path: "text",
        value: "Sample Todo 2",
        timestamp: 200
    },
]

export const retrieveTodos = () => {
    return new Promise<ModelDelta<Todo>[]>((resolve, reject) => {
        setTimeout(() => {
            resolve([...databaseTodos])
        }, 1000)
    })
}

export const writeTodo = (delta: ModelDelta<Todo>) => {
    databaseTodos.push(delta)
}
