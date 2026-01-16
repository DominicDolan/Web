import {Model, ModelData} from "./Model";

export type ModelDeltaBase = {
    modelId: string
    timestamp: number
    type: "create" | "update" | "delete"
}

export type ModelDeltaCreate<M extends Model> = Omit<ModelDeltaBase, "type"> & { type: "create", payload: Partial<ModelData<M>> }

export type ModelDelta<M extends Model> = ModelDeltaBase & {
    payload: Partial<ModelData<M>>
}

export type PartialModelDelta<M extends Model> = Partial<ModelDeltaBase> & {
    payload: Partial<ModelData<M>>
}
