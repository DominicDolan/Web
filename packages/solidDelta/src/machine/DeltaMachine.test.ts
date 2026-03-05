import {describe, expect, test} from "vitest"
import {createDeltaMachine} from "./DeltaMachine";
import {Model} from "@web/schema";

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

describe("DeltaMachine deltaStore reading", () => {
    test("Update to solidDelta machine causes ReadDeltaMachine to update", async () => {
        const store = createDeltaMachine<TestModel>()
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

    test("Updating 2 properties separately causes ReadDeltaMachine to update", async () => {
        const store = createDeltaMachine<TestModel>()
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

    test("Updating 2 properties separately with the same timestamp causes ReadDeltaMachine to update", async () => {
        const store = createDeltaMachine<TestModel>()
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

    test("Pushing to the model machine returns the updated model", async () => {
        const store = createDeltaMachine<TestModel>()
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

    test("Deleting a record removes it from the machine", () => {
        const store = createDeltaMachine<TestModel>()
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
