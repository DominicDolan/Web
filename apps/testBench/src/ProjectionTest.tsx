import {createEffect, createMemo, createProjection, createStore, Errored, For} from "solid-js";
import {createModels} from "@web/solid-delta";
import {ModelDelta} from "@web/solid-delta";

export type User = {
    id: string;
    updatedAt: number;
    firstName: string;
    lastName: string;
}

export function ProjectionTest() {

    const [deltas, setDeltas] = createStore<ModelDelta<User>[]>([
        {
            id: "1",
            path: "",
            value: {
                firstName: "Jane",
                lastName: "Smith"
            },
            timestamp: 100
        },
        {
            id: "2",
            path: "",
            value: {
                firstName: "John",
                lastName: "Doe"
            },
            timestamp: 100
        }
    ])

    const models = createModels(() => deltas)

    function updateLastName(id: string, lastName: string) {
        setDeltas(draft => {
            draft.push({ id, path: "lastName", value: lastName, timestamp: Date.now() });
        })
    }

    const firstUser = createMemo(() => {
        return models[0]
    })

    const secondUser = createMemo(() => {
        return models[1]
    })

    createEffect(() => firstUser().lastName, (newValue) => {
        console.log("first user changed", newValue)
    })
    createEffect(secondUser, (newValue) => {
        console.log("second user changed", newValue)
    })

    return (
        <Errored fallback={(e) => `Error Occurred: ${e()}`}>
            <div>
                <h1>Projection Test</h1>
                <For each={models}>{model => <div>{model.id}: {model.firstName} {model.lastName}</div>}</For>
                <button onClick={() => updateLastName("1", "Doe")}>Update Last Name</button>
            </div>
        </Errored>
    );
}
