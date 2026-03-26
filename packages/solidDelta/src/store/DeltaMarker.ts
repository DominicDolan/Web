import {DeltaStore, InternalKey} from "./DeltaStore";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";


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
            const key = delta.id + "." + delta.path.join(".")
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

            const key = delta.id + "." + delta.path.join(".")
            const timestamp = set.get(key)
            if ((timestamp ?? 0) < delta.timestamp) {
                result.push(delta)
            }
        }
        return result
    }

    return [ getMarked, mark ] as const
}
