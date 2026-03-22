import {Model} from "./Model";

export type ModelDeltaCreate<M extends Model> = {
    modelId: string
    timestamp: number
    type: "create"
    payload: Partial<M>
}

export type ModelDeltaUpdate<M extends Model> = {
    modelId: string
    timestamp: number
    type: "update"
    payload: [keyof M, ...(string | number)[]]
}

export type ModelDeltaDelete<M extends Model> = {
    modelId: string
    timestamp: number
    type: "delete"
    payload: [keyof M, ...(string | number)[]]
}

export type ModelDelta<M extends Model> = ModelDeltaCreate<M> | ModelDeltaUpdate<M> | ModelDeltaDelete<M>

