import {createStore, produce} from "solid-js/store"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "@web/utils"
import {createId} from "@paralleldrive/cuid2";
import {Model, ModelData} from "../models/Model";
import {ModelDelta} from "../models/ModelDelta";
import {deltaArrayToGroup} from "./DeltaReducer";

export type DeltaStore<M extends Model> = readonly [
    {
        (action: "create", deltaPayload: Partial<ModelData<M>>): ModelDelta<M>;
        (action: "delete", modelId: string): ModelDelta<M>;
        (modelId: string, deltaPayload: Partial<ModelData<M>>): ModelDelta<M>;
    },
    {
        getStreamById(id: string): ModelDelta<M>[] | undefined,
        getIds(): string[],
        pushMany: (deltas: ModelDelta<M>[]) => Array<ModelDelta<M>>
        onAnyDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        onAnyDeltaPushById: KeyedEventListener<[ModelDelta<M>[]]>[0]
        onCreateDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        onCreateDeltaPushById: KeyedEventListener<[ModelDelta<M>[]]>[0]
        onUpdateDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        onUpdateDeltaPushById: KeyedEventListener<[ModelDelta<M>[]]>[0]
    }
]

function insertValueByTimestamp<M extends Model>(arr: ModelDelta<M>[], el: ModelDelta<M>) {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = (left + right) >>> 1; // Faster than Math.floor
        if (arr[mid].timestamp <= el.timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    arr.splice(left, 0, el);
}

export function createDeltaStore<M extends Model>() {
    const [deltaStreams, setDeltaStream] = createStore<Record<string, ModelDelta<M>[]>>({})

    const [onAnyDeltaPush, triggerAnyDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onAnyDeltaPushById, triggerAnyDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
    const [onUpdateDeltaPush, triggerUpdateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onUpdateDeltaPushById, triggerUpdateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()
    const [onCreateDeltaPush, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()
    const [onCreateDeltaPushById, triggerCreateDeltaPushById] = createKeyedEvent<[ModelDelta<M>[]]>()

    function pushManyByModelId(modelId: string, deltas: ModelDelta<M>[]) {
        const deltaArray = deltas.toSorted((a, b) => a.timestamp - b.timestamp)
        const stream = deltaStreams[modelId] as ModelDelta<M>[] | null
        if (stream == null) {
            setDeltaStream(modelId, deltaArray)
            triggerCreateDeltaPush(deltaArray)
            triggerCreateDeltaPushById(modelId, deltaArray)
        } else {
            setDeltaStream(modelId, produce((arr) => {
                for (const event of deltaArray) {
                    insertValueByTimestamp(arr, event)
                }
            }))
        }
        triggerUpdateDeltaPush(deltaArray)
        triggerUpdateDeltaPushById(modelId, deltaArray)
        triggerAnyDeltaPush(deltaArray)
        triggerAnyDeltaPushById(modelId, deltaArray)
    }

    function pushDeleteOrUpdate(modelId: string, deltaPayload?: Partial<ModelData<M>>) {
        const delta: ModelDelta<M> = {
            modelId,
            timestamp: Date.now(),
            type: deltaPayload == undefined ? "delete" : "update",
            payload: deltaPayload == undefined ? {} : deltaPayload,
        }

        pushManyByModelId(modelId, [delta])

        return delta
    }

    function pushCreate(deltaPayload: Partial<ModelData<M>>) {
        const modelId = createId()
        const delta: ModelDelta<M> = {
            modelId,
            timestamp: Date.now(),
            type: "create",
            payload: deltaPayload,
        }

        pushManyByModelId(modelId, [delta])

        return delta
    }

    function pushDelta(action: "delete", modelId: string): ModelDelta<M>
    function pushDelta(action: "create", deltaPayload: Partial<ModelData<M>>): ModelDelta<M>
    function pushDelta(modelId: string, deltaPayload: Partial<ModelData<M>>): ModelDelta<M>
    function pushDelta(arg1: string, arg2?: string | Partial<ModelData<M>> | ModelDelta<M>): ModelDelta<M> {
        if (arg1 === "delete") {
            return pushDeleteOrUpdate(arg2 as string)
        } else if (arg1 === "create") {
            return pushCreate(arg2 as Partial<ModelData<M>>)
        } else {
            return pushDeleteOrUpdate(arg1, arg2 as Partial<ModelData<M>>)
        }
    }

    function pushManyDeltas(deltas: ModelDelta<M>[]): Array<ModelDelta<M>> {
        const grouped = deltaArrayToGroup(deltas)
        for (const modelId in grouped) {
            pushManyByModelId(modelId, grouped[modelId])
        }
        return deltas
    }

    return [
        pushDelta,
        {
            getStreamById(id: string): ModelDelta<M>[] | undefined {
                return deltaStreams?.[id]
            },
            getIds() {
                return Object.keys(deltaStreams ?? {})
            },
            pushMany: pushManyDeltas,
            onAnyDeltaPush,
            onAnyDeltaPushById,
            onCreateDeltaPush,
            onCreateDeltaPushById,
            onUpdateDeltaPush,
            onUpdateDeltaPushById,
        }
    ] as DeltaStore<M>
}
