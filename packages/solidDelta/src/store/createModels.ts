import {Accessor, createEffect, createMemo, createProjection} from "solid-js";
import {Model, PartialModel} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";

function insertValueByTimestamp<M extends Model>(arr: ModelDelta<M>[], el: ModelDelta<M>) {
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
                insertValueByTimestamp(draft[delta.id], delta)
                continue
            }

            const existingDeltaIndex = draft[delta.id].findIndex(d => d.path === delta.path)
            if (existingDeltaIndex === -1) {
                insertValueByTimestamp(draft[delta.id], delta)
                continue
            }

            if (draft[delta.id][existingDeltaIndex].timestamp < delta.timestamp) {
                draft[delta.id].splice(existingDeltaIndex, 1)
                insertValueByTimestamp(draft[delta.id], delta)
            }
        }
    }, {} as Record<string, ModelDelta<M>[]>)

    const arrayMapById = createProjection((draft) => {
        for (const delta of deltas()) {
            if (!delta.path.includes("$array")) {
                continue
            }

            const [pathKey, rest ] = delta.path.split(".$array")

            if (draft[delta.id] == null) {
                draft[delta.id] = {}
            }

            if (draft[delta.id][pathKey] == null) {
                draft[delta.id][pathKey] = []
            }

            const path = rest.split(".")
            const [_, key, nextPart] = path
            let index = draft[delta.id][pathKey].findIndex((a: any) => a.key === key)

            if (index === -1) {
                draft[delta.id][pathKey].push({ key })
                index = draft[delta.id][pathKey].length - 1
            }

            if (nextPart == null) {
                if (delta.value == undefined) {
                    draft[delta.id][pathKey].splice(index, 1)
                    continue
                }
                if (delta.value.$value != null) {
                    draft[delta.id][pathKey][index].$value = delta.value.$value
                } else {
                    if (draft[delta.id][pathKey][index].$value == null) {
                        draft[delta.id][pathKey][index].$value = {}
                    }
                    for (const deltaKey in delta.value) {
                        if (deltaKey === "$order") {
                            continue
                        }
                        draft[delta.id][pathKey][index].$value[deltaKey] = delta.value[deltaKey]
                    }
                }

                draft[delta.id][pathKey][index].$order = delta.value.$order
            } else if (nextPart === "$value") {
                draft[delta.id][pathKey][index].$value = delta.value
            } else if (nextPart === "$order") {
                draft[delta.id][pathKey][index].$order = delta.value
            } else {
                if (draft[delta.id][pathKey][index].$value == null) {
                    draft[delta.id][pathKey][index].$value = {}
                }
                applyObjectPathToModel(draft[delta.id][pathKey][index].$value, nextPart, delta.value)
            }
        }
    }, {} as Record<string, Record<string, { key: string, $order?: number, $value?: any }[]>>)

    return createProjection((draft) => {
        for (const id in deltasByIdNoArrays) {
            const existingIndex = draft.findIndex(m => m.id === id)

            const index = existingIndex === -1 ? draft.length : existingIndex
            for (const delta of deltasByIdNoArrays[id]) {
                if (delta.path === "" && delta.value === undefined) {
                    draft[index] = undefined as unknown as M
                } else if (delta.path === "" && delta.value !== undefined) {
                    if (draft[index] === undefined) {
                        draft[index] = { id } as M
                    }
                    for (const key in delta.value) {
                        draft[index][key as keyof M] = delta.value[key]
                    }

                    draft[index].updatedAt = Math.max(delta.timestamp, draft[index].updatedAt ?? -Infinity)
                } else {
                    if (draft[index] === undefined) {
                        draft[index] = { id } as M
                    }
                    applyObjectPathToModel(draft[index], delta.path, delta.value)
                    draft[index].updatedAt = Math.max(delta.timestamp, draft[index].updatedAt ?? -Infinity)
                }
            }
        }

        for (const id in arrayMapById) {
            for (const pathKey in arrayMapById[id]) {
                const array = arrayMapById[id][pathKey]
                    .toSorted((a, b) => (a.$order ?? Number.MAX_VALUE) - (b.$order ?? Number.MAX_VALUE))
                    .map((item) => item.$value)

                const model = draft.find(item => item.id === id) ?? { id } as M
                applyObjectPathToModel(model, pathKey, array)

                model.updatedAt = Math.max(/*delta.timestamp*/0, model.updatedAt ?? -Infinity)
            }
        }

        for (let i = 0; i < draft.length; i++) {
            if (draft[i] === undefined) {
                draft.splice(i, 1);
                i--;
            }
        }

    }, [] as M[])
}

