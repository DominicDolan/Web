import {expect, test} from "vitest"
import {createDeltaStore} from "./DeltaStore"
import {Model} from "../../../../d1/src/Model";

interface TestModel extends Model {
    name: string
}

test("DeltaStore stores pushed delta", () => {
    const store = createDeltaStore()
    const [pushDelta, { getStreamById }] = store
    const delta = pushDelta("create", { name: "test 1" })
    const modelId = delta.modelId

    const deltaStream = getStreamById(modelId)

    expect(deltaStream?.length).toBe(1)
    expect(deltaStream?.[0].modelId).toEqual(modelId)
})

test("DeltaStore stores pushed deltas in order of timestamp", () => {
    const store = createDeltaStore<TestModel>()
    const [pushDelta, { getStreamById, pushMany }] = store
    const modelId = "testId-1"

    pushMany([
        { modelId, type: "create", timestamp: 0, payload: { name: "create"}},
        { modelId, type: "update", timestamp: 200, payload: { name: "middle" }},
        { modelId, type: "update", timestamp: 1000, payload: { name: "last" }},
        { modelId, type: "update", timestamp: 500, payload: { name: "middle" }},
        { modelId, type: "update", timestamp: 300, payload: { name: "middle" }},
        { modelId, type: "update", timestamp: 400, payload: { name: "middle" }},
        { modelId, type: "update", timestamp: 600, payload: { name: "middle" }},
        { modelId, type: "update", timestamp: 100, payload: { name: "first" }},
        { modelId, type: "update", timestamp: 700, payload: { name: "middle" }},
    ])

    const deltaStream = getStreamById(modelId)

    const lastElement = deltaStream?.at(-1)
    const createElement = deltaStream?.at(0)
    const firstElement = deltaStream?.at(1)

    expect(lastElement?.modelId).toEqual(modelId)
    expect(firstElement?.modelId).toEqual(modelId)
    expect(lastElement?.payload.name).toEqual("last")
    expect(createElement?.payload.name).toEqual("create")
    expect(firstElement?.payload.name).toEqual("first")
})
