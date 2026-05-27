// @vitest-environment node
import {describe, expect, it} from "vitest";
import {
    createEffect,
    createMemo,
    createProjection,
    createRoot,
    createSignal,
    createStore,
    flush,
    reconcile, snapshot,
} from "solid-js";
import {render, renderToStringAsync} from "@solidjs/web";


function App() {
    // const [state, setState] = createSignal([ { id: "1", firstName: "John" }, { id: "1", lastName: "Smith" }])
    //
    // const projection = createProjection((draft) => {
    //     console.log("projection")
    //     const uniqueIds = new Set(state().map(item => item.id))
    //
    //     for (const id of uniqueIds) {
    //         if (draft[id] == null) {
    //             draft[id] = {}
    //         }
    //
    //         for (const delta of state().filter(item => item.id === id)) {
    //             draft[id] = {...draft[id], ...delta}
    //         }
    //     }
    //
    // }, {} as Record<string, any>)

    return <div>Test</div>
}
describe("createProjection", () => {
    it('should reconcile changes to an array', async () => {
        let task1Updates = 0;
        let task2Updates = 0;

        createRoot(() => {
            const [deltas, setDeltas] = createStore([ { id: "1", firstName: "John" }, { id: "1", lastName: "Smith" }] as Array<{ id: string, firstName?: string, lastName?: string }>)

            const uniqueIds = createMemo(() => Array.from(new Set(deltas.map(item => item.id)).values()))
            const models = createProjection((draft) => {
                for (const id of uniqueIds()) {
                    const existing = draft.findIndex(item => item.id === id)

                    let modelDraft = {}
                    for (const delta of deltas.filter(item => item.id === id)) {
                        modelDraft = {...modelDraft, ...delta}
                    }

                    if (existing !== -1) {
                        for (const modelDraftKey in modelDraft) {
                            console.log("setting", modelDraftKey)
                            if (modelDraftKey === "id") {
                                continue
                            }
                            if (draft[existing][modelDraftKey] !== modelDraft[modelDraftKey]) {
                                console.log("setting key", modelDraftKey, "to", modelDraft[modelDraftKey], "existing", draft[existing][modelDraftKey])
                                draft[existing][modelDraftKey] = modelDraft[modelDraftKey]
                            }
                        }
                        console.log("final draft", draft[existing])
                    } else {
                        draft.push(modelDraft)
                    }
                }

            }, [] as Array<{ id: string, firstName?: string, lastName?: string }>)

            const user1 = createMemo(() => models.find(item => item.id === "1"))
            const user2 = createMemo(() => models.find(item => item.id === "2"))

            setTimeout(() => {
                console.log("setting Jane")

                setDeltas((draft) => {
                    draft.push({ id: "1", firstName: "Jane" })
                })
            }, 40)

            setTimeout(() => {
                console.log("setting Bob")
                setDeltas((draft) => {
                    draft.push({ id: "2", firstName: "Bob" })
                })
            }, 60)

            createEffect(user1, (value) => {
                console.log("user1", value?.firstName)
                console.log("full state", snapshot(models))
            })

            createEffect(user2, (value) => {
                console.log("user2", value?.firstName)
                console.log("full state", snapshot(models))
            })

        })

        await new Promise(resolve => setTimeout(resolve, 100))


        console.log("task1Updates: ", task1Updates, " task2Updates: ", task2Updates)
    });
})
