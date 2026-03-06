import {Model, ModelData, PartialModel, ModelDelta} from "@web/schema";


export function reduceMixedDeltas<M extends Model>(deltas: ModelDelta<M>[]): Record<string, Partial<M>> {
    const ids = new Set(deltas.map(e => e.modelId))
    function reduceById(id: string): Partial<M> {
        const deltasById = deltas
            .filter(e => e.modelId === id)
            .toSorted((a, b) => a.timestamp - b.timestamp)

        return deltasById.reduce((acc: Partial<M>, v) => {
            return {
                ...acc,
                ...v
            }
        }, { id, updatedAt: deltas.at(-1)?.timestamp ?? new Date().getTime() } as Partial<M>)
    }


    const map: Record<string, Partial<M>> = {}
    for (const id of ids) {
        map[id] = reduceById(id)
    }

    return map
}

export function reduceDeltasToModel<M extends Model>(deltas: ModelDelta<M>[]): PartialModel<M> | null {
    return reduceDeltasToModelAfter(deltas, -1)
}

export function reduceDeltasToModelAfter<M extends Model>(deltas: ModelDelta<M>[], after: number): PartialModel<M> | null {
    if (deltas.length === 0) {
        return {} as PartialModel<M>
    }
    const ids = new Set(deltas.map(e => e.modelId))
    if (ids.size !== 1) {
        if (ids.size === 0) {
            throw new Error("undefined modelId, reconcileEvents be called with deltas that have a modelId")
        } else {
            throw new Error("reconcileEvents should be called with deltas from a single Model, multiple IDs: " + Array.from(ids).join(", "))
        }
    }
    const id = Array.from(ids)[0]

    const acc = { id, updatedAt: deltas.at(-1)?.timestamp ?? Date.now() } as PartialModel<M>
    const handledKeys = ["modelId", "timestamp"]

    for (let i = deltas.length - 1; i >= 0; i--) {
        if (deltas[i].timestamp <= after) {
            continue
        }
        if (deltas[i].type === "delete") return null

        for (const key in deltas[i].payload) {

            if (handledKeys.includes(key)) continue

            acc[key as keyof PartialModel<M>] = deltas[i].payload[key as keyof ModelData<M>] as any
            handledKeys.push(key)
        }
        if (deltas[i].type === "create") break
    }

    return acc
}

export function squashDeltasToSingle<M extends Model>(deltas: ModelDelta<M>[]): ModelDelta<M> | null {
    const lastDelta = deltas.at(-1)
    if (deltas.length < 1 || lastDelta == undefined) {
        throw new Error("Cannot squash deltas, the given array is empty")
    }

    const payload: Partial<ModelDelta<M>["payload"]> = {}
    const handledKeys: string[] = ["modelId", "timestamp"]
    for (let i = deltas.length - 1; i >= 0; i--) {
        for (const key in deltas[i].payload) {
            if (handledKeys.includes(key)) continue

            payload[key as keyof ModelDelta<M>["payload"]] = deltas[i].payload[key as keyof ModelData<M>] as any
            handledKeys.push(key)
        }
    }
    let type: ModelDelta<M>["type"]
    const hasCreate = deltas.some(d => d.type === "create")
    const hasDelete = deltas.some(d => d.type === "delete")
    if (hasCreate && hasDelete) {
        return null
    } else if (hasCreate) {
        type = "create"
    } else if (hasDelete) {
        type = "delete"
    } else {
        type = "update"
    }
    return { modelId: lastDelta.modelId, timestamp: lastDelta.timestamp, payload, type } as ModelDelta<M>
}

export function reduceDeltasOntoModel<M extends Model>(model: PartialModel<M>, deltas: ModelDelta<M>[]): PartialModel<M> | null {
    if (model == null) {
        debugger
    }
    const newModel = reduceDeltasToModelAfter(deltas, model.updatedAt)
    if (newModel == null) return null

    return {
        ...model,
        ...newModel
    }
}

export function deltaArrayToGroup<M extends Model>(deltas: ModelDelta<M>[]): Record<string, ModelDelta<M>[]> {
    const groups: Record<string, ModelDelta<M>[]> = {}

    for (const delta of deltas) {
        if (groups[delta.modelId] == null) {
            groups[delta.modelId] = []
        }
        groups[delta.modelId].push(delta)
    }

    return groups
}

export function reduceGroupedDeltas<M extends Model>(deltas: Record<string, ModelDelta<M>[]>) {
    const ids = Object.keys(deltas)

    const map = {} as Record<string, PartialModel<M>>
    for (const id of ids) {
        const model = reduceDeltasToModel(deltas[id])
        if (model == null) continue

        map[id] = model
    }

    return map
}

export function reduceGroupedDeltasToArray<M extends Model>(deltas: Record<string, ModelDelta<M>[]>) {
    const ids = Object.keys(deltas)

    return ids.map(id => reduceDeltasToModel(deltas[id]))
}
