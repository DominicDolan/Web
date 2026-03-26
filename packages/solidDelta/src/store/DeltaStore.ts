import {Model, PartialModel} from "@web/schema";
import {createMemo, createProjection, createStore, StoreSetter} from "solid-js";
import {diffPaths} from "../utils/diffPaths";
import {ModelDelta} from "../model/ModelDelta";

export function setByPath(obj: Record<string, any>, path: string[], value: any) {
    if (path.length === 0) return

    let nestedObj = obj
    for (let i = 0; i < path.length - 1; i++) {
        if (nestedObj[path[i]] == null) {
            nestedObj[path[i]] = {}
        }
        nestedObj = nestedObj[path[i]]
    }
    nestedObj[path.at(-1)!] = value
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

export const InternalKey = Symbol("InternalKey")

export type SetModels<M extends Model> = StoreSetter<Record<string, Partial<Omit<M, "id" | "updatedAt">>>>

export function createDeltaStore<M extends Model>(initialData?: () => ModelDelta<M>[] | Promise<ModelDelta<M>[]>) {
    const deltas = createMemo(initialData ?? (() => ([] as ModelDelta<M>[])))

    const [deltasLocal, setDeltasLocal] = createStore((store: ModelDelta<M>[]) => {
        for (const delta of deltas()) {
            // TODO: use insertValueByTimestamp(store, delta) when there's no bug
            store.push(delta)
        }
    }, [] as ModelDelta<M>[])

    const modelsById = createProjection<Record<string, PartialModel<M>>>((store) => {
        for (const delta of deltasLocal) {
            const model = store[delta.id]
            const updatedAt = model?.updatedAt > delta.timestamp ? model.updatedAt : delta.timestamp
            if (model == null) {
                store[delta.id] = { id: delta.id, updatedAt } as PartialModel<M>
            }
            setByPath(store, [delta.id, ...delta.path as any], delta.value)
        }
    }, {} as Record<string, PartialModel<M>>)

    const models = createProjection(() => Object.values(modelsById), [] as PartialModel<M>[])

    const setModels: SetModels<M> = (fn) => {
        const old = JSON.parse(JSON.stringify(modelsById))
        const draft = JSON.parse(JSON.stringify(modelsById))
        fn(draft)

        const paths = diffPaths(old, draft)
        const timestamp = Date.now()

        const deltas = paths.map((path) => {
            if (path.path.at(-1) === "updatedAt" || path.path.at(-1) === "id") return null

            return ({
                id: path.path[0],
                path: path.path.slice(1),
                value: path.value,
                timestamp
            });
        }).filter(Boolean) as ModelDelta<M>[]

        setDeltasLocal((store) => {
            store.push(...deltas)
        })
    }

    const store = [
        models,
        setModels,
    ] as const

    ;(store as unknown as any)[InternalKey] = { deltas: deltasLocal }

    return store
}

export type DeltaStore<M extends Model> = ReturnType<typeof createDeltaStore<M>>
