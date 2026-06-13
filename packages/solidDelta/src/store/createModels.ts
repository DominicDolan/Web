import {Accessor, createProjection} from "solid-js";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {useDeltaWriter} from "./useDeltaWriter.ts";

type ArrayItem = { key: string, $order?: number, $value?: any, timestamp: number }
type ArrayMap = Record<string, ArrayItem[]>

function insertDeltaByTimestamp<M extends Model>(arr: ModelDelta<M>[], el: ModelDelta<M>) {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = (left + right) >>> 1;
        if (arr[mid].timestamp <= el.timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    arr.splice(left, 0, el);
}


function insertUniqueDeltaByTimestamp<M extends Model>(deltas: ModelDelta<M>[], currentDelta: ModelDelta<M>) {
    let existingDeltaIndex: number
    if (currentDelta.path === "") {
        existingDeltaIndex = deltas.findIndex(d => d.path === "" && (d.value == null) === (currentDelta.value == null))
    } else {
        existingDeltaIndex = deltas.findIndex(d => d.path === currentDelta.path)
    }

    if (existingDeltaIndex === -1) {
        insertDeltaByTimestamp(deltas, currentDelta)
        return
    }

    if (deltas[existingDeltaIndex].timestamp < currentDelta.timestamp) {
        deltas.splice(existingDeltaIndex, 1)
        insertDeltaByTimestamp(deltas, currentDelta)
    }
}

function applyObjectPathToModel(model: any, path: string, value: any) {
    const pathParts = path.split(".")
    let currentObj = model

    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const next = pathParts[i + 1];

        if (next == null) {
            if (value === undefined) {
                delete currentObj[part];
            } else {
                currentObj[part] = value;
            }
            return
        }

        if (currentObj[part] == null) {
            currentObj[part] = {};
        }

        currentObj = currentObj[part];
    }
}

function applyArrayDeltaToMap<M extends Model>(arrayMap: ArrayMap, delta: ModelDelta<M>) {
    const [pathKey, rest] = delta.path.split(".$array")

    if (arrayMap[pathKey] == null) {
        arrayMap[pathKey] = []
    }

    const path = rest.split(".")
    const [_, key, nextPart] = path
    let index = arrayMap[pathKey].findIndex((a: any) => a.key === key)

    if (index === -1) {
        arrayMap[pathKey].push({key, timestamp: delta.timestamp})
        index = arrayMap[pathKey].length - 1
    }

    if (arrayMap[pathKey][index].timestamp > delta.timestamp) {
        return
    } else {
        arrayMap[pathKey][index].timestamp = delta.timestamp
    }

    if (nextPart == null) {
        if (delta.value == undefined) {
            arrayMap[pathKey].splice(index, 1)
            return
        }
        if (delta.value.$value != null) {
            arrayMap[pathKey][index].$value = delta.value.$value
        } else {
            if (arrayMap[pathKey][index].$value == null) {
                arrayMap[pathKey][index].$value = {}
            }
            for (const deltaKey in delta.value) {
                if (deltaKey === "$order") {
                    continue
                }
                arrayMap[pathKey][index].$value[deltaKey] = delta.value[deltaKey]
            }
        }

        arrayMap[pathKey][index].$order = delta.value.$order
    } else if (nextPart === "$value") {
        arrayMap[pathKey][index].$value = delta.value
    } else if (nextPart === "$order") {
        arrayMap[pathKey][index].$order = delta.value
    } else {
        if (arrayMap[pathKey][index].$value == null) {
            arrayMap[pathKey][index].$value = {}
        }
        applyObjectPathToModel(arrayMap[pathKey][index].$value, nextPart, delta.value)
    }
}

function applyArrayMapToModel<M extends Model>(model: M, arrayMap: ArrayMap) {
    for (const pathKey in arrayMap) {
        const array = arrayMap[pathKey]
            .toSorted((a, b) => (a.$order ?? Number.MAX_VALUE) - (b.$order ?? Number.MAX_VALUE))
            .map((item) => item.$value)

        applyObjectPathToModel(model, pathKey, array)
    }
}

export function createModel<M extends Model>(deltas: ModelDelta<M>[]) {
    const deltasNoArrays: ModelDelta<M>[] = []
    const deltasArrays: ModelDelta<M>[] = []
    const model = {} as M
    const arrayMap = {} as ArrayMap
    let visible = true

    for (const delta of deltas) {
        if (model.id == null) {
            model.id = delta.id
        }

        if (delta.id !== model.id) throw new Error(
            `Expected all deltas to have the same id. Received id ${delta.id} and id ${model.id}`
        )

        if (delta.path.includes("$array")) {
            continue
        }

        if (delta.path === "") {
            insertDeltaByTimestamp(deltasNoArrays, delta)
            continue
        }

        insertUniqueDeltaByTimestamp(deltasNoArrays, delta)
    }

    for (const delta of deltas) {
        if (!delta.path.includes("$array")) {
            continue
        }

        insertUniqueDeltaByTimestamp(deltasArrays, delta)
    }

    for (const delta of deltasNoArrays) {
        if (delta.path === "" && delta.value === undefined) {
            for (const key in model) {
                if (key !== "id") {
                    delete model[key]
                }
            }
            visible = false
        } else if (delta.path === "" && delta.value !== undefined) {
            visible = true
            for (const key in delta.value) {
                model[key as keyof M] = delta.value[key]
            }

            model.updatedAt = Math.max(delta.timestamp, model.updatedAt ?? -Infinity)
        } else {
            applyObjectPathToModel(model, delta.path, delta.value)
            model.updatedAt = Math.max(delta.timestamp, model.updatedAt ?? -Infinity)
        }
    }

    if (!visible) {
        return undefined
    }

    for (const delta of deltasArrays) {
        applyArrayDeltaToMap(arrayMap, delta)
    }

    applyArrayMapToModel(model, arrayMap)
    return model
}

export function createModels<M extends Model>(
    deltas: Accessor<readonly ModelDelta<M>[]>
) {

    const deltasByIdNoArrays = createProjection((draft) => {
        for (const delta of deltas()) {
            if (delta.path.includes("$array")) {
                continue
            }

            if (draft[delta.id] == null) {
                draft[delta.id] = [delta]
                continue
            }

            if (delta.path === "") {
                insertDeltaByTimestamp(draft[delta.id], delta)
                continue
            }

            insertUniqueDeltaByTimestamp(draft[delta.id], delta)
        }
    }, {} as Record<string, ModelDelta<M>[]>)

    const deltasByIdArrays = createProjection((draft) => {
        for (const delta of deltas()) {
            if (!delta.path.includes("$array")) {
                continue
            }

            if (draft[delta.id] == null) {
                draft[delta.id] = [delta]
                continue
            }

            insertUniqueDeltaByTimestamp(draft[delta.id], delta)
        }
    }, {} as Record<string, ModelDelta<M>[]>)

    const arrayMapById = createProjection((draft) => {
        for (const id in deltasByIdArrays) {
            for (const delta of deltasByIdArrays[id]) {
                if (draft[id] == null) {
                    draft[id] = {}
                }
                applyArrayDeltaToMap(draft[id], delta)
            }
        }
    }, {} as Record<string, ArrayMap>)

    const createDeltas = useDeltaWriter(deltas)

    const models = createProjection(() => {

        const draft = [] as Array<(M & { _deleted?: boolean })>

        for (const id in deltasByIdNoArrays) {
            const existingIndex = draft.findIndex(m => m && m.id === id)

            const index = existingIndex === -1 ? draft.length : existingIndex
            for (const delta of deltasByIdNoArrays[id]) {
                if (draft[index] == undefined) {
                    draft[index] = { id } as M
                }
                if (delta.path === "" && delta.value === undefined) {
                    draft[index]._deleted = true
                } else if (delta.path === "" && delta.value !== undefined) {
                    delete draft[index]._deleted
                    for (const key in delta.value) {
                        draft[index][key as keyof M] = delta.value[key]
                    }

                    draft[index].updatedAt = Math.max(delta.timestamp, draft[index].updatedAt ?? -Infinity)
                } else {
                    applyObjectPathToModel(draft[index], delta.path, delta.value)
                    draft[index].updatedAt = Math.max(delta.timestamp, draft[index].updatedAt ?? -Infinity)
                }
            }
        }

        for (const id in arrayMapById) {
            let model = draft.find(item => item && item.id === id)

            if (model == null) {
                const isDeleted = deltasByIdNoArrays[id]?.some(d => d.path === "" && d.value === undefined)
                if (isDeleted) continue

                model = { id } as M
                draft.push(model)
            }

            applyArrayMapToModel(model, arrayMapById[id])
            model.updatedAt = Math.max(0, model.updatedAt ?? -Infinity)
        }

        // Replace temporary workaround with this after bug is fixed in beta.15
        /*for (let i = draft.length - 1; i >= 0; i--) {
            if (draft[i] === undefined) {
                draft.splice(i, 1);
            }
        }*/

        // temporary workaround
        return draft.filter(m => !m?._deleted) as M[]
    }, [] as M[])

    return [models, createDeltas] as const
}
