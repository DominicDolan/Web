import {Model, PartialModel} from "@web/schema";
import {createMemo, createProjection, createStore, refresh, snapshot, StoreSetter} from "solid-js";
import {diffPaths} from "../utils/diffPaths";
import {ModelDelta} from "../model/ModelDelta";

export function setByPath(obj: Record<string, any>, path: string[], value: any) {
    if (path.length === 0) return

    let nestedObj = obj
    for (let i = 0; i < path.length - 1; i++) {
        if (nestedObj[path[i]] == null) {
            if (value === undefined) return
            nestedObj[path[i]] = {}
        }
        nestedObj = nestedObj[path[i]]
    }

    if (value === undefined) {
        if (nestedObj) delete nestedObj[path.at(-1)!]
    } else {
        nestedObj[path.at(-1)!] = value
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

export const InternalKey = Symbol("InternalKey")

export type SetModels<M extends Model> = StoreSetter<Record<string, Partial<Omit<M, "id" | "updatedAt">>>>

/**
 * Creates a reactive delta-based store for managing a collection of models.
 *
 * A DeltaStore maintains a reactive state derived from a sequence of changes (deltas).
 * It is particularly useful for synchronization, undo/redo, and offline-first
 * applications where state is represented as a stream of immutable events.
 *
 * The store provides:
 * 1. A reactive accessor for the current state (an array of models).
 * 2. A draft-based setter that automatically computes and records new deltas by diffing
 *    changes made to the current state.
 *
 * @template M - The model type, which must extend {@link Model}.
 * @template Valid - A boolean flag indicating if the store should assume models are complete.
 *                   Defaults to `true`.
 *
 * @param {() => ModelDelta<M>[] | Promise<ModelDelta<M>[]>} [initialData] - A function or memo
 *        that returns the initial set of deltas. Supports both synchronous and asynchronous
 *        resolution.
 * @param {Object} [opts] - Configuration options.
 * @param {Valid} [opts.assumeValid=true] - If true, models are typed as `M`. If false,
 *        they are typed as {@link PartialModel<M>}.
 *
 * @returns {DeltaStore<M>} A tuple-like object containing:
 *          - `[0]`: A reactive accessor (signal) returning the array of models.
 *          - `[1]`: A setter function `(fn: (draft: Record<string, M>) => void) => void`
 *                   which allows mutating a draft to generate new deltas.
 *
 * @example
 * ```typescript
 * interface Todo extends Model {
 *   title: string;
 *   completed: boolean;
 * }
 *
 * // Initialize store with an optional delta source
 * const [todos, setTodos] = createDeltaStore<Todo>(() => fetchTodoDeltas());
 *
 * // Adding a new model via the draft-based setter
 * const addTodo = (title: string) => {
 *   const id = createId();
 *   setTodos(draft => {
 *     draft[id] = { title, completed: false };
 *   });
 * };
 *
 * // Updating a model (automatically computes path-based deltas)
 * const toggleTodo = (id: string) => {
 *   setTodos(draft => {
 *     draft[id].completed = !draft[id].completed;
 *   });
 * };
 *
 * // Accessing the reactive state
 * return (
 *   <For each={todos()}>
 *     {(todo) => <li>{todo.title}</li>}
 *   </For>
 * );
 * ```
 */
export function createDeltaStore<M extends Model, Valid extends boolean = true>(initialData?: () => ModelDelta<M>[] | Promise<ModelDelta<M>[]>, opts?: { assumeValid: Valid }) {
    const deltas = createMemo(initialData ?? (() => ([] as ModelDelta<M>[])))

    const [deltasLocal, setDeltasLocal] = createStore((store: ModelDelta<M>[]) => {
        for (const delta of deltas()) {
            // TODO: use insertValueByTimestamp(store, delta) when there's no bug
            store.push(delta)
        }
    }, [] as ModelDelta<M>[])

    const modelsById = createProjection<Record<string, PartialModel<M>>>((store) => {
        for (const delta of deltasLocal) {
            const pathParts = delta.path.split(".").filter(Boolean)
            const fullPath = [delta.id, ...pathParts]

            if (pathParts.length === 0 && delta.value === undefined) {
                delete store[delta.id]
                continue
            }

            const model = store[delta.id]
            const updatedAt = model?.updatedAt > delta.timestamp ? model.updatedAt : delta.timestamp
            if (model == null) {
                store[delta.id] = { id: delta.id, updatedAt } as PartialModel<M>
            }

            setByPath(store, fullPath, delta.value)
        }
    }, {} as Record<string, Valid extends true ? M : PartialModel<M>>)

    const models = createProjection(() => Object.values(modelsById) as Array<Valid extends true ? M : PartialModel<M>>, [])

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
                path: path.path.slice(1).join("."),
                value: path.value,
                timestamp
            });
        }).filter(Boolean) as ModelDelta<M>[]

        setDeltasLocal((store) => {
            store.push(...deltas)
        })

        setTimeout(() => {
            refresh(models)
        })
    }

    const store = [
        models,
        setModels,
    ] as const

    ;(store as unknown as any)[InternalKey] = { deltas: deltasLocal, initFn: deltas }

    return store
}

export type DeltaStore<M extends Model> = ReturnType<typeof createDeltaStore<M>>
