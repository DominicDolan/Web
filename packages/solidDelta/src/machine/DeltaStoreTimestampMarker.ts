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

    function isNew(id: string, timestamp: number): boolean
    function isNew(delta: ModelDelta<M>): boolean
    function isNew(arg1: ModelDelta<M> | string, timestamp: number | undefined = undefined) {
        if (typeof arg1 === "string") {
            if (timestampsById[arg1] == null) return true
            return (timestamp ?? 0) > timestampsById[arg1]
        }
        const marked = timestampsById[arg1.modelId]
        if (marked == null) return true

        return arg1.timestamp > marked
    }

    return {
        mark,
        markAll,
        isNew,
        getStreamFromMarked,
        getTimestampsById: (id: string) => timestampsById[id] ?? 0
    }
}

export { createDeltaStoreTimestampMarker }
