import {describe, expect, test} from "vitest"
import {createModelStore} from "~/packages/repository/ModelStore"
import {Model} from "~/data/Model";

interface TestModel extends Model {
    name: string
    age: number
}

async function sleep(time: number) {
    return new Promise<void>((res) => {
        setTimeout(() => {
            res()
        }, time)
    })
}

describe("ModelStore deltaStore reading", () => {
    test("Update to delta store causes ReadModelStore to update", async () => {
        const store = createModelStore<TestModel>()
        const [values, pushDelta, { pushMany }] = store

        const modelId = "someId"
        const name = "some name"

        const readModels = values

        expect(readModels).not.toBeUndefined()
        expect(readModels?.length).toBe(0)
        pushMany([{
            modelId,
            timestamp: 100,
            type: "create",
            payload: {
                name
            }
        }])

        expect(readModels?.length).toBe(1)
        expect(readModels?.[0].name).toEqual(name)

    })

    test("Updating 2 properties separately causes ReadModelStore to update", async () => {
        const store = createModelStore<TestModel>()
        const [values, pushDelta, { pushMany }] = store

        const modelId = "someId"
        const name = "some name"
        const age = 21

        const readModels = values

        expect(readModels).not.toBeUndefined()
        expect(readModels?.length).toBe(0)

        pushMany([{
            modelId,
            timestamp: 100,
            type: "create",
            payload: {
                name
            }
        }])

        expect(readModels?.length).toBe(1)

        pushMany([{
            modelId,
            timestamp: 200,
            type: "update",
            payload: {
                age
            }
        }])

        expect(readModels?.length).toBe(1)
        expect(readModels?.[0].name).toEqual(name)
        expect(readModels?.[0].age).toEqual(age)

    })

    test("Updating 2 properties separately with the same timestamp causes ReadModelStore to update", async () => {
        const store = createModelStore<TestModel>()
        const [values, _, { pushMany }] = store

        const modelId = "someId"
        const name = "some name"
        const age = 21

        const readModels = values

        expect(readModels).not.toBeUndefined()
        expect(readModels?.length).toBe(0)

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

        expect(readModels?.length).toBe(1)
        expect(readModels?.[0].name).toEqual(name)
        expect(readModels?.[0].age).toEqual(age)

    })

    test("Pushing to the model store returns the updated model", async () => {
        const store = createModelStore<TestModel>()
        const [_, push, { pushMany }] = store

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

    test("Deleting a record removes it from the store", () => {
        const store = createModelStore<TestModel>()
        const [values, push, { pushMany }] = store

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

        expect(values?.length).toBe(1)

        pushMany([{
            modelId,
            timestamp: 200,
            type: "delete",
            payload: {}
        }])

        expect(values?.length).toBe(0)
    })
})
