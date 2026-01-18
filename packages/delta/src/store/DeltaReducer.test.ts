import {expect, test, describe} from "vitest"
import {Model} from "../models/Model";
import {ModelDelta} from "../models/ModelDelta";
import {reduceDeltasToModelAfter, squashDeltasToSingle} from "./DeltaReducer";


interface TestModel extends Model {
    name: string
}

describe("reduceDeltasAfter", () => {
    test("list of single delta with name should reduce to model", () => {
        const modelId = "someId"
        const name = "some name"
        const deltas: ModelDelta<TestModel>[] = [
            {
                modelId,
                timestamp: 100,
                type: "create",
                payload: {
                    name
                }
            }
        ]

        const model = reduceDeltasToModelAfter(deltas, 0)

        expect(model).not.toBeNull()
        expect(model?.id).toEqual(modelId)
        expect(model?.name).toEqual(name)
    })

    test("list of multiple deltas with name should reduce to model", () => {
        const modelId = "someId"
        const name = "updated name"
        const deltas: ModelDelta<TestModel>[] = [
            {
                modelId,
                timestamp: 100,
                type: "create",
                payload: {}
            },
            {
                modelId,
                timestamp: 200,
                type: "update",
                payload: {
                    name: "some name"
                }
            },
            {
                modelId,
                timestamp: 300,
                type: "update",
                payload: {
                    name
                }
            },
        ]

        const model = reduceDeltasToModelAfter(deltas, 0)

        expect(model).not.toBeNull()
        expect(model?.id).toEqual(modelId)
        expect(model?.name).toEqual(name)
    })

    test("list of deltas should only be reduced after the timestamp", () => {
        const modelId = "someId"
        const name = "updated name"
        const lastName = "some last name"
        const deltas: ModelDelta<TestModel & { lastName: string }>[] = [
            {
                modelId,
                timestamp: 100,
                type: "create",
                payload: {}
            },
            {
                modelId,
                timestamp: 200,
                type: "update",
                payload: {
                    lastName
                }
            },
            {
                modelId,
                timestamp: 300,
                type: "update",
                payload: {
                    name: "initial name"
                }
            },
            {
                modelId,
                timestamp: 300,
                type: "update",
                payload: {
                    name
                }
            },
        ]

        const model = reduceDeltasToModelAfter(deltas, 250)

        expect(model).not.toBeNull()
        expect(model?.id).toEqual(modelId)
        expect(model?.name).toEqual(name)
        expect(model?.lastName).toBeUndefined()
    })
})

describe("squashDeltasToSingle", () => {
    test("Should be able to squash deltas to a single delta", () => {
        const modelId = "someId"
        const name = "updated name"
        const lastName = "some last name"
        const deltas: ModelDelta<TestModel & { lastName: string }>[] = [
            {
                modelId,
                timestamp: 100,
                type: "create",
                payload: {}
            },
            {
                modelId,
                timestamp: 200,
                type: "update",
                payload: {
                    lastName
                }
            },
            {
                modelId,
                timestamp: 300,
                type: "update",
                payload: {
                    name: "initial name"
                }
            },
            {
                modelId,
                timestamp: 300,
                type: "update",
                payload: {
                    name
                }
            },
        ]


        const delta = squashDeltasToSingle(deltas)

        expect(delta).not.toBeNull()
        expect(delta?.modelId).toEqual(modelId)
        expect(delta?.payload.name).toEqual(name)
        expect(delta?.payload.lastName).toEqual(lastName)
    })

    test("Should squash deltas in the right order", () => {
        const modelId = "someId"
        const name = "updated name"
        const updatedName = "updated name 2"
        const firstDelta: ModelDelta<TestModel> = {
            modelId,
            timestamp: 100,
            type: "update",
            payload: { name }
        }

        const secondDelta: ModelDelta<TestModel> = {
            modelId,
            timestamp: 100,
            type: "update",
            payload: { name: updatedName }
        }
        const delta = squashDeltasToSingle([firstDelta, secondDelta])

        expect(delta).not.toBeNull()
        expect(delta?.modelId).toEqual(modelId)
        expect(delta?.payload.name).toEqual(updatedName)
    })
})
