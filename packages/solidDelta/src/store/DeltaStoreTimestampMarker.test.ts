import {describe, expect, test} from "vitest"
import {Model} from "@web/schema"
import {createDeltaStore} from "./DeltaStore"
import {createModelStore} from "./ModelStore"
import {createDeltaStoreTimestampMarker} from "./DeltaStoreTimestampMarker"

interface TestModel extends Model {
    name: string
    age: number
}

describe("createDeltaStoreTimestampMarker", () => {
    test("returns full stream when unmarked and empty stream for unknown ids", () => {
        const store = createDeltaStore<TestModel>()
        const [, {pushMany}] = store
        const modelId = "model-1"

        pushMany([
            { modelId, timestamp: 10, type: "create", payload: { name: "alpha" } },
            { modelId, timestamp: 20, type: "update", payload: { age: 10 } },
            { modelId, timestamp: 30, type: "update", payload: { name: "beta" } },
        ])

        const marker = createDeltaStoreTimestampMarker(store)

        expect(marker.getTimestampsById(modelId)).toBe(0)
        expect(marker.getStreamFromMarked(modelId).map(delta => delta.timestamp)).toEqual([10, 20, 30])
        expect(marker.getStreamFromMarked("missing")).toEqual([])
    })

    test("mark with explicit timestamp excludes deltas at or before the mark", () => {
        const store = createDeltaStore<TestModel>()
        const [, {pushMany}] = store
        const modelId = "model-2"

        pushMany([
            { modelId, timestamp: 10, type: "create", payload: { name: "alpha" } },
            { modelId, timestamp: 20, type: "update", payload: { age: 20 } },
        ])

        const marker = createDeltaStoreTimestampMarker(store)
        marker.mark(modelId, 20)

        pushMany([
            { modelId, timestamp: 20, type: "update", payload: { age: 21 } },
            { modelId, timestamp: 25, type: "update", payload: { age: 22 } },
        ])

        expect(marker.getTimestampsById(modelId)).toBe(20)
        expect(marker.getStreamFromMarked(modelId).map(delta => delta.timestamp)).toEqual([25])
    })

    test("mark without explicit timestamp uses latest delta timestamp", () => {
        const store = createDeltaStore<TestModel>()
        const [, {pushMany}] = store
        const modelId = "model-3"

        pushMany([
            { modelId, timestamp: 100, type: "create", payload: { name: "alpha" } },
            { modelId, timestamp: 200, type: "update", payload: { age: 20 } },
            { modelId, timestamp: 300, type: "update", payload: { name: "omega" } },
        ])

        const marker = createDeltaStoreTimestampMarker(store)
        marker.mark(modelId)

        expect(marker.getTimestampsById(modelId)).toBe(300)
        expect(marker.getStreamFromMarked(modelId)).toEqual([])
    })

    test("markAll without timestamp marks each id at its latest timestamp", () => {
        const store = createDeltaStore<TestModel>()
        const [, {pushMany}] = store

        pushMany([
            { modelId: "model-a", timestamp: 5, type: "create", payload: { name: "a" } },
            { modelId: "model-a", timestamp: 10, type: "update", payload: { age: 1 } },
            { modelId: "model-b", timestamp: 2, type: "create", payload: { name: "b" } },
            { modelId: "model-b", timestamp: 7, type: "update", payload: { age: 2 } },
        ])

        const marker = createDeltaStoreTimestampMarker(store)
        marker.markAll()

        expect(marker.getTimestampsById("model-a")).toBe(10)
        expect(marker.getTimestampsById("model-b")).toBe(7)

        pushMany([
            { modelId: "model-a", timestamp: 11, type: "update", payload: { age: 3 } },
            { modelId: "model-b", timestamp: 9, type: "update", payload: { age: 4 } },
        ])

        expect(marker.getStreamFromMarked("model-a").map(delta => delta.timestamp)).toEqual([11])
        expect(marker.getStreamFromMarked("model-b").map(delta => delta.timestamp)).toEqual([9])
    })

    test("works when initialized with DeltaStore functions object", () => {
        const store = createDeltaStore<TestModel>()
        const [, functions] = store

        functions.pushMany([
            { modelId: "model-c", timestamp: 5, type: "create", payload: { name: "c" } },
            { modelId: "model-c", timestamp: 8, type: "update", payload: { age: 1 } },
            { modelId: "model-d", timestamp: 1, type: "create", payload: { name: "d" } },
            { modelId: "model-d", timestamp: 6, type: "update", payload: { age: 2 } },
            { modelId: "model-d", timestamp: 9, type: "update", payload: { age: 3 } },
        ])

        const marker = createDeltaStoreTimestampMarker(functions)
        marker.markAll(6)

        expect(marker.getTimestampsById("model-c")).toBe(6)
        expect(marker.getTimestampsById("model-d")).toBe(6)
        expect(marker.getStreamFromMarked("model-c").map(delta => delta.timestamp)).toEqual([8])
        expect(marker.getStreamFromMarked("model-d").map(delta => delta.timestamp)).toEqual([9])
    })

    test("works when initialized with a ModelStore tuple", () => {
        const modelStore = createModelStore<TestModel>()
        const [, , {pushMany}] = modelStore
        const modelId = "model-ms"

        pushMany([
            { modelId, timestamp: 50, type: "create", payload: { name: "base" } },
            { modelId, timestamp: 80, type: "update", payload: { age: 12 } },
        ])

        const marker = createDeltaStoreTimestampMarker(modelStore)
        marker.mark(modelId)

        expect(marker.getTimestampsById(modelId)).toBe(80)
        expect(marker.getStreamFromMarked(modelId)).toEqual([])
    })
})
