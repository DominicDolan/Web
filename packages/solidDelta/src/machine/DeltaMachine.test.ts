import {describe, expect, test} from "vitest"
import {createDeltaMachine} from "./DeltaMachine";
import {Model} from "@web/schema";

interface TestModel extends Model {
    name: string
    age: number
}

describe("DeltaMachine deltaStore reading", () => {
    test("Update to solidDelta machine causes ReadDeltaMachine to update", () => {
        const store = createDeltaMachine<TestModel>()
        const { models, pushMany } = store

        const modelId = "someId"
        const name = "some name"

        expect(models).not.toBeUndefined()
        expect(models.length).toBe(0)
        pushMany([{
            modelId,
            timestamp: 100,
            type: "create",
            payload: {
                name
            }
        }])

        expect(models.length).toBe(1)
        expect(models[0].name).toEqual(name)
    })

    test("Updating 2 properties separately causes ReadDeltaMachine to update", () => {
        const store = createDeltaMachine<TestModel>()
        const { models, pushMany } = store

        const modelId = "someId"
        const name = "some name"
        const age = 21

        expect(models).not.toBeUndefined()
        expect(models.length).toBe(0)

        pushMany([{
            modelId,
            timestamp: 100,
            type: "create",
            payload: {
                name
            }
        }])

        expect(models.length).toBe(1)

        pushMany([{
            modelId,
            timestamp: 200,
            type: "update",
            payload: {
                age
            }
        }])

        expect(models.length).toBe(1)
        expect(models[0].name).toEqual(name)
        expect(models[0].age).toEqual(age)
    })

    test("Updating 2 properties separately with the same timestamp causes ReadDeltaMachine to update", () => {
        const store = createDeltaMachine<TestModel>()
        const { models, pushMany } = store

        const modelId = "someId"
        const name = "some name"
        const age = 21

        expect(models).not.toBeUndefined()
        expect(models.length).toBe(0)

        pushMany([
            {
                modelId,
                timestamp: 100,
                type: "create",
                payload: {
                    name
                }
            },
            {
                modelId,
                timestamp: 100,
                type: "update",
                payload: {
                    age
                }
            }
        ])

        expect(models.length).toBe(1)
        expect(models[0].name).toEqual(name)
        expect(models[0].age).toEqual(age)
    })

    test("Pushing to the model machine returns the updated model", () => {
        const store = createDeltaMachine<TestModel>()
        const { push, pushMany } = store

        const modelId = "someId"
        const name = "some name"

        pushMany([{
            modelId,
            timestamp: 100,
            type: "create",
            payload: {}
        }])

        const newModel = push(modelId, { name })

        expect(newModel.name).toEqual(name)
    })

    test("Deleting a record removes it from the machine", () => {
        const store = createDeltaMachine<TestModel>()
        const { models, pushMany } = store

        const modelId = "someId"
        const name = "some name"

        pushMany([{
            modelId,
            timestamp: 100,
            type: "create",
            payload: {
                name
            }
        }])

        expect(models.length).toBe(1)

        pushMany([{
            modelId,
            timestamp: 200,
            type: "delete",
            payload: {}
        }])

        expect(models.length).toBe(0)
    })
})

describe("DeltaMachine delta marking", () => {
    test("markOld sets the baseline for getNewDeltasById and on.newDeltaPush", () => {
        const store = createDeltaMachine<TestModel>()
        const { pushMany, markOld, getNewDeltasById, on } = store
        const modelId = "model-1"
        const pushedTimestamps: number[] = []

        on.newDeltaPush((deltas) => {
            pushedTimestamps.push(...deltas.map(delta => delta.timestamp))
        })

        pushMany([
            { modelId, timestamp: 10, type: "create", payload: { name: "alpha" } },
            { modelId, timestamp: 20, type: "update", payload: { age: 10 } },
        ])

        expect(getNewDeltasById(modelId).map(delta => delta.timestamp)).toEqual([10, 20])
        expect(pushedTimestamps).toEqual([])

        markOld(modelId)

        expect(getNewDeltasById(modelId)).toEqual([])

        pushMany([
            { modelId, timestamp: 30, type: "update", payload: { age: 11 } },
        ])

        expect(getNewDeltasById(modelId).map(delta => delta.timestamp)).toEqual([30])
        expect(pushedTimestamps).toEqual([30])
    })

    test("markAllOld applies the baseline to all existing ids", () => {
        const store = createDeltaMachine<TestModel>()
        const { pushMany, markAllOld, getNewDeltasById, on } = store
        const pushedTimestamps: number[] = []

        on.newDeltaPush((deltas) => {
            pushedTimestamps.push(...deltas.map(delta => delta.timestamp))
        })

        pushMany([
            { modelId: "model-a", timestamp: 5, type: "create", payload: { name: "a" } },
            { modelId: "model-b", timestamp: 7, type: "create", payload: { name: "b" } },
        ])

        markAllOld()

        expect(getNewDeltasById("model-a")).toEqual([])
        expect(getNewDeltasById("model-b")).toEqual([])

        pushMany([
            { modelId: "model-a", timestamp: 8, type: "update", payload: { age: 1 } },
            { modelId: "model-b", timestamp: 9, type: "update", payload: { age: 2 } },
        ])

        expect(getNewDeltasById("model-a").map(delta => delta.timestamp)).toEqual([8])
        expect(getNewDeltasById("model-b").map(delta => delta.timestamp)).toEqual([9])
        expect(pushedTimestamps.sort((a, b) => a - b)).toEqual([8, 9])
    })
})
