import {Accessor, createEffect, createMemo, createProjection} from "solid-js";
import {Model, PartialModel} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {cloneValue, isPlainObject} from "../utils/ObjectUtils";

type ProjectedModel<M extends Model, Valid extends boolean> = Valid extends true ? M : PartialModel<M>
type ProjectedModelsById<M extends Model, Valid extends boolean> = Record<string, ProjectedModel<M, Valid>>

type FormattedDeltas<M extends Model> = {
    id: string
    timestamp: number
    path: string[]
    value: any
}

function formatPath(path: string): string[] {
    const sanitizedPath = path.replace(/\.$/, '');
    return path.split('.');
}

export function useModelCreator<M extends Model>(deltas: Accessor<readonly ModelDelta<M>[]>) {

    const formattedDeltas: Accessor<FormattedDeltas<M>[]> = createMemo(() => {



        return deltas().map(delta => {
            const path = delta.path.split(".")
            const sanitizedPath = path
                .map(segment => segment.trim())
            return ({
                id: delta.id,
                timestamp: delta.timestamp,
                path: delta.path,
                value: delta.value
            });
        })
    })
    return {
        formattedDeltas: createMemo(() => {

            return deltas().map(delta => {
                const path = delta.path.split(".")
                const sanitizedPath = path
                    .map(segment => segment.trim())
                return ({
                    id: delta.id,
                    timestamp: delta.timestamp,
                    path: delta.path,
                    value: delta.value
                });
            })
        })
    }
}

//
// export function createModel<M extends Model>(deltas: Accessor<readonly ModelDelta<M>[]>) {
//
//     const model = createProjection((draft) => {
//         const sortedDeltas = [...deltas()].sort((a, b) => a.timestamp - b.timestamp)
//
//         let latestCreate = -Infinity;
//         let latestDelete = -Infinity;
//
//         for (const delta of sortedDeltas) {
//             if (delta.path !== "") continue;
//
//             if (delta.value === undefined) {
//                 latestDelete = Math.max(latestDelete, delta.timestamp);
//             } else {
//                 latestCreate = Math.max(latestCreate, delta.timestamp);
//             }
//         }
//     })
//
//     const idDeltas = [...unsortedDeltas].sort((a, b) => a.timestamp - b.timestamp);
//     let latestCreate = -Infinity;
//     let latestDelete = -Infinity;
//
//     for (const delta of idDeltas) {
//         if (delta.path !== "") continue;
//
//         if (delta.value === undefined) {
//             latestDelete = Math.max(latestDelete, delta.timestamp);
//         } else {
//             latestCreate = Math.max(latestCreate, delta.timestamp);
//         }
//     }
//
//     if (latestCreate === -Infinity || latestDelete > latestCreate) continue;
//
//     const model = {id, updatedAt: latestCreate} as PartialModel<M>;
//     const writeTimestamps = new Map<string, number>();
//
//     for (const delta of idDeltas) {
//         if (delta.path === "") {
//             if (delta.value === undefined) continue;
//
//             for (const key in delta.value) {
//                 if (key === "id" || key === "updatedAt") continue
//
//                 model[key as keyof PartialModel<M>] = delta.value[key]
//             }
//         } else {
//             const pathKey = delta.path;
//             const existingTimestamp = writeTimestamps.get(delta.path);
//             if (existingTimestamp != null && existingTimestamp > delta.timestamp) continue;
//
//             writeTimestamps.set(pathKey, delta.timestamp);
//             setByPath(model, splitPath(delta.path), delta.value);
//         }
//     }
//
//     model.updatedAt = Math.max(
//         latestCreate,
//         ...[...writeTimestamps.values()],
//     );
//     modelsById[id] = model;
// }

export function useDeltasById<M extends Model>(id: string, allDeltas: Accessor<readonly ModelDelta<M>[]>) {
    const deltasById = createProjection((draft) => {
        draft.splice(0, draft.length, ...allDeltas().filter(delta => delta.id === id));
    }, [] as ModelDelta<M>[])
    return {
        deltasById
    }
}

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

export function createModels<M extends Model>(
    deltas: Accessor<readonly ModelDelta<M>[]>
) {
    console.log("createModels", deltas)

    const deltasById = createProjection((draft) => {
        console.log("deltasById")
        for (const delta of deltas()) {
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

            if (draft[delta.id][existingDeltaIndex].timestamp > delta.timestamp) {
                draft[delta.id].splice(existingDeltaIndex, 1)
                insertValueByTimestamp(draft[delta.id], delta)
            }
        }
    }, {} as Record<string, ModelDelta<M>[]>)

    return createProjection((draft) => {
        for (const id in deltasById) {
            const existingIndex = draft.findIndex(m => m.id === id)

            const index = existingIndex === -1 ? draft.length : existingIndex
            for (const delta of deltasById[id]) {
                if (delta.path === "" && delta.value === undefined) {
                    draft[index] = undefined as unknown as M
                } else if (delta.path === "" && delta.value !== undefined) {
                    if (draft[index] === undefined) {
                        draft[index] = { id } as M
                    }
                    for (const key in delta.value) {
                        draft[index][key as keyof M] = delta.value[key]
                    }
                } else {
                    if (draft[index] === undefined) {
                        draft[index] = { id } as M
                    }
                    draft[index][delta.path as keyof M] = delta.value
                }
            }

        }

        for (let i = 0; i < draft.length; i++) {
            if (draft[i] === undefined) {
                draft.splice(i, 1);
                i--;
            }
        }

        console.log("draft", draft)
    }, [] as M[])
}


export function createModelsById2<M extends Model, Valid extends boolean = true>(
    deltas: Accessor<readonly ModelDelta<M>[]>,
    _opts?: { assumeValid: Valid },
): Accessor<ProjectedModelsById<M, Valid>> {
    return createMemo(() => {
        const grouped = new Map<string, ModelDelta<M>[]>();

        for (const delta of deltas()) {
            const group = grouped.get(delta.id);
            if (group == null) {
                grouped.set(delta.id, [delta]);
            } else {
                group.push(delta);
            }
        }

        const modelsById: Record<string, PartialModel<M>> = {};

        for (const [id, unsortedDeltas] of grouped) {
            const idDeltas = [...unsortedDeltas].sort((a, b) => a.timestamp - b.timestamp);
            let latestCreate = -Infinity;
            let latestDelete = -Infinity;

            for (const delta of idDeltas) {
                if (delta.path !== "") continue;

                if (delta.value === undefined) {
                    latestDelete = Math.max(latestDelete, delta.timestamp);
                } else {
                    latestCreate = Math.max(latestCreate, delta.timestamp);
                }
            }

            if (latestCreate === -Infinity || latestDelete > latestCreate) continue;

            const model = {id, updatedAt: latestCreate} as PartialModel<M>;
            const writeTimestamps = new Map<string, number>();

            for (const delta of idDeltas) {
                if (delta.path === "") {
                    if (delta.value === undefined) continue;

                    for (const key in delta.value) {
                        if (key === "id" || key === "updatedAt") continue

                        model[key as keyof PartialModel<M>] = delta.value[key]
                    }
                } else {
                    const pathKey = delta.path;
                    const existingTimestamp = writeTimestamps.get(delta.path);
                    if (existingTimestamp != null && existingTimestamp > delta.timestamp) continue;

                    writeTimestamps.set(pathKey, delta.timestamp);
                    setByPath(model, splitPath(delta.path), delta.value);
                }
            }

            model.updatedAt = Math.max(
                latestCreate,
                ...[...writeTimestamps.values()],
            );
            modelsById[id] = model;
        }

        return modelsById as ProjectedModelsById<M, Valid>;
    });
}

export function createModels2<M extends Model, Valid extends boolean = true>(
    deltas: Accessor<readonly ModelDelta<M>[]>,
    opts?: { assumeValid: Valid },
): Accessor<Array<ProjectedModel<M, Valid>>> {
    const modelsById = createModelsById2(deltas, opts);

    return createMemo(() => Object.values(modelsById()) as Array<ProjectedModel<M, Valid>>);
}

function splitPath(path: string): string[] {
    return path.split(".").filter(Boolean);
}

function applyWrite(
    model: Record<string, any>,
    path: string[],
    value: any,
    timestamp: number,
    writeTimestamps: Map<string, number>,
) {
    if (path.length === 0) return;

    const pathKey = path.join(".");
    const existingTimestamp = writeTimestamps.get(pathKey);
    if (existingTimestamp != null && existingTimestamp > timestamp) return;

    writeTimestamps.set(pathKey, timestamp);
    setByPath(model, path, value);
}

function setByPath(obj: Record<string, any>, path: string[], value: any) {
    let nestedObj = obj;

    for (let i = 0; i < path.length - 1; i++) {
        const part = path[i];

        if (nestedObj[part] == null || typeof nestedObj[part] !== "object" || Array.isArray(nestedObj[part])) {
            if (value === undefined) return;
            nestedObj[part] = {};
        }

        nestedObj = nestedObj[part];
    }

    const key = path.at(-1)!;
    if (value === undefined) {
        delete nestedObj[key];
    } else {
        nestedObj[key] = cloneValue(value);
    }
}

function valueWrites(path: string[], value: any): Array<{ path: string[], value: any }> {
    if (!isPlainObject(value)) return [{path, value}];

    const entries = Object.entries(value)
        .filter(([key]) => key !== "id" && key !== "updatedAt");

    if (entries.length === 0 && path.length > 0) return [{path, value}];

    return entries.flatMap(([key, child]) => valueWrites([...path, key], child));
}

