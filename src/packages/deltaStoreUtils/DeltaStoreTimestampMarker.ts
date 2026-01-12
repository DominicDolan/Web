import {DeltaStore} from "~/packages/repository/DeltaStore";
import {Model} from "~/data/Model";
import {createStore} from "solid-js/store";
import {batch} from "solid-js";
import {ModelStore} from "~/packages/repository/ModelStore";

function createDeltaStoreTimestampMarker<M extends Model>(store: DeltaStore<M> | ModelStore<M> | DeltaStore<M>[1] | ModelStore<M>[2]) {

    const storeFns: DeltaStore<M>[1] | ModelStore<M>[2] = (function () {
        if ("getStreamById" in store) {
            return store
        }
        if ("getStreamById" in store[1]) {
            return store[1] as DeltaStore<M>[1]
        }

        return store[2] as ModelStore<M>[2]
    })()

    const [timestampsById, setTimestampsById] = createStore<Record<string, number>>({})

    function mark(id: string, timestamp?: number) {
        console.log("marking", id, "with timestamp", timestamp ?? 0)
        if (timestamp == undefined) {
            timestamp = storeFns.getStreamById(id)?.at(-1)?.timestamp ?? 0
        }

        setTimestampsById(id, timestamp)
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

    return {
        mark,
        markAll,
        getStreamFromMarked,
        getTimestampsById: (id: string) => timestampsById[id] ?? 0
    }
}

export { createDeltaStoreTimestampMarker }
