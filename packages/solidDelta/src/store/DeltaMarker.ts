import {DeltaStore, InternalKey} from "./DeltaStore";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";


/**
 * Creates a marker utility for tracking changes (deltas) in a {@link DeltaStore}.
 *
 * The marker allows you to capture a "snapshot" of the current state of deltas and
 * subsequently retrieve only the new or updated deltas that have occurred since that snapshot.
 *
 * It supports two modes:
 * 1. **Snapshot mode**: Calling `mark()` without arguments records the latest timestamp for every
 *    unique `id` and `path` combination currently in the store. `getMarked()` then returns any
 *    deltas that have a strictly newer timestamp for their respective path.
 * 2. **Timestamp mode**: Calling `mark(timestamp)` sets a fixed baseline. `getMarked()` will
 *    then return all deltas with a timestamp greater than the baseline.
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
    function getDeltas() {
        return (store as any)[InternalKey].deltas as ModelDelta<M>[]
    }

    let timestampRef: number | undefined
    function mark(timestamp?: number) {
        timestampRef = timestamp
        set.clear()
        const deltas = getDeltas()

        for (const delta of deltas) {
            const key = delta.id + "." + delta.path
            const timestamp = set.get(key)
            if (timestamp == null || timestamp < delta.timestamp) {
                set.set(key, delta.timestamp)
            }
        }
    }

    function getMarked() {
        const deltas = getDeltas()
        const result: ModelDelta<M>[] = []
        for (const delta of deltas) {
            if (timestampRef != null) {
                if (timestampRef < delta.timestamp) {
                    result.push(delta)
                }
                continue
            }

            const key = delta.id + "." + delta.path
            const timestamp = set.get(key)
            if ((timestamp ?? 0) < delta.timestamp) {
                result.push(delta)
            }
        }
        return result
    }

    return [ getMarked, mark ] as const
}
