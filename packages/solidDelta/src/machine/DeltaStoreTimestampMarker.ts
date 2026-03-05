import {createStore} from "solid-js/store";
import {batch} from "solid-js";
import {Model, ModelDelta} from "@web/schema";
import {DeltaStore} from "./DeltaStore";

function createDeltaStoreTimestampMarker<M extends Model>(store: DeltaStore<M> | DeltaStore<M>[1]) {

    const storeFns: DeltaStore<M>[1] = (function () {
        if ("getStreamById" in store) {
            return store
        }
        if ("getStreamById" in store[1]) {
            return store[1] as DeltaStore<M>[1]
        }
        throw new Error("Invalid store")
    })()

    const [timestampsById, setTimestampsById] = createStore<Record<string, number>>({})

    function mark(id: string, timestamp?: number) {
        if (timestamp == undefined) {
            timestamp = storeFns.getStreamById(id)?.at(-1)?.timestamp ?? 0
        }

        setTimestampsById(id, timestamp as number)
    }

    function markAll(timestamp?: number) {
        batch(() => {
            for (const id of storeFns.getIds()) {
                mark(id, timestamp)
            }
        })
    }

    function getStreamFromMarked(id: string) {
        const stream = storeFns.getStreamById(id)
        if (stream == null) return []
        const marked = timestampsById[id] ?? 0

        for (let i = stream.length - 1; i >= 0; i--) {
            if (stream[i].timestamp <= marked) {
                return stream.slice(i + 1)
            }
        }
        return stream.slice()
    }

    function isMarked(delta: ModelDelta<M>) {
        const marked = timestampsById[delta.modelId]
        if (marked == null) return false

        return delta.timestamp >= marked
    }

    return {
        mark,
        markAll,
        isMarked,
        getStreamFromMarked,
        getTimestampsById: (id: string) => timestampsById[id] ?? 0
    }
}

export { createDeltaStoreTimestampMarker }
