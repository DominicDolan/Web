import {DeltaStore, InternalKey} from "./DeltaStore";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {createMemo, resolve} from "solid-js";


/**
 * Creates a marker utility for tracking changes (deltas) in a {@link DeltaStore}.
 *
 * The marker allows you to capture a "snapshot" of the current state of deltas and
 * subsequently retrieve only the new or updated deltas that have occurred since that snapshot.
 *
 * It supports two modes:
 * 1. **Snapshot mode**: Calling `mark()` without arguments records the latest timestamp for every
 *    unique `id` and `path` combination currently in the store. `getMarked()` then returns the
 *    most recent delta for each unique `id` and `path` that has a strictly newer timestamp than the snapshot.
 * 2. **Timestamp mode**: Calling `mark(timestamp)` sets a fixed baseline. `getMarked()` will
 *    then return the most recent delta for each unique `id` and `path` with a timestamp greater than the baseline.
 *
 * @template M - The model type managed by the store.
 * @param store - The {@link DeltaStore} instance to monitor.
 * @returns A tuple `[getMarked, mark]`:
 * - `getMarked`: A function that returns an array of {@link ModelDelta} added since the last mark.
 * - `mark`: A function to set the current baseline. Accepts an optional `timestamp`.
 *
 * @example
 * ```typescript
 * const [getNewDeltas, markBaseline] = createMarker(myStore);
 *
 * // Mark the current state as the starting point
 * markBaseline();
 *
 * // Perform some operations on the store...
 * myStore.update(id, { name: 'New Name' });
 *
 * // Retrieve only the changes that happened after markBaseline()
 * const changes = getNewDeltas();
 * console.log(changes); // [ { id, path: 'name', timestamp: ..., value: 'New Name' } ]
 * ```
 *
 * @throws {Error} If the provided store was not created via `createDeltaStore` (missing internal metadata).
 */
export function createMarker<M extends Model>(store: DeltaStore<M>) {
    if ((store as any)[InternalKey]?.deltas == null) {
        throw new Error("The Store provided to createMarker has to be created with createDeltaStore.")
    }

    const set = new Map<string, number>()
    const getDeltas = createMemo(() => {
        return (store as any)[InternalKey].deltas as ModelDelta<M>[]
    })

    const initFn = (store as any)[InternalKey].initFn

    let timestampRef: number | undefined
    async function mark(timestamp?: number) {
        timestampRef = timestamp
        set.clear()
        await resolve(() => initFn())
        for (const delta of getDeltas()) {
            const key = delta.id + "." + delta.path
            const lastTimestamp = set.get(key)
            if (lastTimestamp == null || lastTimestamp <= delta.timestamp) {
                set.set(key, delta.timestamp)
            }
        }
    }

    async function getMarked() {
        await new Promise(resolve => setTimeout(resolve, 0))

        const deltas = getDeltas()
        const latestDeltas = new Map<string, ModelDelta<M>>()

        for (const delta of deltas) {
            const key = delta.id + "." + delta.path

            let isNewer = false
            if (timestampRef != null) {
                if (timestampRef < delta.timestamp) {
                    isNewer = true
                }
            } else {
                const lastMarkedTimestamp = set.get(key)
                if ((lastMarkedTimestamp ?? 0) < delta.timestamp) {
                    isNewer = true
                }
            }

            if (isNewer) {
                const existing = latestDeltas.get(key)
                if (!existing || existing.timestamp <= delta.timestamp) {
                    latestDeltas.set(key, delta)
                }
            }
        }
        return Array.from(latestDeltas.values())
    }

    return [ getMarked, mark ] as const
}
