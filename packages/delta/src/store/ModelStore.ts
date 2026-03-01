import {createStore, produce, reconcile} from "solid-js/store"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "@web/utils"
import {Model, ModelData, PartialModel, ModelDelta} from "@web/schema";
import {createDeltaStore, DeltaStore} from "./DeltaStore";
import {reduceDeltasOntoModel, reduceDeltasToModel} from "./DeltaReducer";

export type ModelStorePush<M extends Model> = {
    (action: "create", deltaPayload: Partial<ModelData<M>>): M;
    (action: "delete", modelId: string): M;
    (modelId: string, deltaPayload: Partial<ModelData<M>>): M;
}

export type ModelStoreFunctions<M extends Model> = {
    getModelById(id: string): M | undefined,
    getStreamById(id: string): ModelDelta<M>[] | undefined,
    getIds(): string[],
    pushMany: DeltaStore<M>[1]["pushMany"]
    onModelCreate: EventListener<[PartialModel<M>]>[0]
    onModelUpdate: EventListener<[PartialModel<M>]>[0]
    onModelDelete: EventListener<[string]>[0]
    onAnyDeltaPush: DeltaStore<M>[1]["onAnyDeltaPush"]
    onModelUpdateById: KeyedEventListener<[PartialModel<M>]>[0]
}

export type ModelStore<M extends Model> = [
    modelsList: M[],
    ModelStorePush<M>,
    ModelStoreFunctions<M>
]

export type ModelRecord<M extends Model> = Record<string, ModelDelta<M>[]>

export function createModelStore<M extends Model>(initialDeltas?: ModelRecord<M>): ModelStore<M> {
    const [pushDelta, { getStreamById, pushMany, onCreateDeltaPush, onUpdateDeltaPushById, onAnyDeltaPush, getIds }] = createDeltaStore()
    const [modelsById, setModelsById] = createStore<Record<string, M>>({})
    const [modelsListStore, setModelListStore] = createStore<M[]>([])

    const [onModelUpdate, triggerModelUpdate] = createEvent<[PartialModel<M>]>()
    const [onModelUpdateById, triggerModelUpdateById] = createKeyedEvent<[PartialModel<M>]>()
    const [onModelCreate, triggerModelCreate] = createEvent<[PartialModel<M>]>()
    const [onCreateDeltaPushInternal, triggerCreateDeltaPush] = createEvent<[ModelDelta<M>[]]>()

    const [onModelDelete, triggerModelDelete] = createEvent<[string]>()

    onCreateDeltaPush((values) => {
        triggerCreateDeltaPush(values)
    })

    onCreateDeltaPushInternal((events) => {
        const modelFromEvents = reduceDeltasToModel(events)
        if (modelFromEvents == null) return

        const modelId = events[0].modelId
        setModelsById(modelFromEvents.id, modelFromEvents as M)
        triggerModelCreate(modelFromEvents)
        triggerModelUpdate(modelFromEvents)
        triggerModelUpdateById(modelId, modelFromEvents)

        onUpdateDeltaPushById(modelId, (updates) => {
            onModelUpdatedById(modelId)
        })
    })

    onModelUpdate((model) => {
        const index = modelsListStore.findIndex(m => m.id === model.id)
        if (index === -1) {
            setModelListStore(modelsListStore.length, model as M)
        } else {
            setModelListStore(index, reconcile(model as M))
        }
    })

    onModelDelete((id) => {
        const index = modelsListStore.findIndex(m => m.id === id)
        if (index === -1) {
            return
        } else {
            setModelListStore(produce((arr) => arr.splice(index, 1)))
        }

    })

    if (initialDeltas != null) {
        for (const key in initialDeltas) {
            pushMany(initialDeltas[key])
        }
    }

    function onModelUpdatedById(modelId: string) {
        const stream = getStreamById(modelId)
        if (stream == undefined) return

        const oldModel = modelsById[modelId]
        const newModel = reduceDeltasOntoModel(oldModel, stream)

        if (newModel == null) {
            setModelsById(produce((models) => {
                delete models[modelId]
            }))
            triggerModelDelete(modelId)
            return
        }

        setModelsById(modelId, reconcile(newModel as M))
        triggerModelUpdate(newModel)
        triggerModelUpdateById(modelId, newModel)
    }

    function pushDeltaAndGetModel(action: "delete", modelId: string): M
    function pushDeltaAndGetModel(action: "create", deltaPayload: Partial<ModelData<M>>): M
    function pushDeltaAndGetModel(modelId: string, deltaPayload: Partial<ModelData<M>>): M
    function pushDeltaAndGetModel(arg1: string, arg2?: string | Partial<ModelData<M>> | ModelDelta<M>): M {
        const delta = pushDelta(arg1, arg2 as string | Partial<ModelData<M>> | ModelDelta<M>)
        return modelsById[delta.modelId]
    }

    return [
        modelsListStore,
        pushDeltaAndGetModel,
        {
            getModelById(id: string): M | undefined {
                return modelsById[id]
            },
            getIds,
            pushMany,
            getStreamById,
            onModelUpdate,
            onModelUpdateById,
            onAnyDeltaPush,
            onModelCreate,
            onModelDelete
        }
    ] as ModelStore<M>
}
