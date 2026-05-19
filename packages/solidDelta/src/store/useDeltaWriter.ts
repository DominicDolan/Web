import {Accessor} from "solid-js";
import {Model, ModelData} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {diffPaths} from "../utils/diffPaths";
import {createModelsById} from "./createModels";
import {createId} from "@paralleldrive/cuid2";
import {cloneValue, isPlainObject} from "../utils/ObjectUtils";

type ModelCreateData<M extends Model> = ModelData<M> & Partial<Pick<M, "id">>
type ModelPatch<M extends Model> = Partial<M>
type ModelDraft<M extends Model> = M

export type WriteDeltas<M extends Model> = {
    (operation: "create", value: ModelCreateData<M>): ModelDelta<M>[]
    (operation: "delete", id: string): ModelDelta<M>[]
    <Id extends string>(
        id: Id extends "create" | "delete" ? never : Id,
        patchOrMutation: ModelPatch<M> | ((draft: ModelDraft<M>) => void),
    ): ModelDelta<M>[]
}

export function useDeltaWriter<M extends Model>(
    deltas: Accessor<readonly ModelDelta<M>[]>,
): WriteDeltas<M> {
    const modelsById = createModelsById(deltas);

    return ((idOrOperation: string, patchOrMutation: unknown) => {
        if (idOrOperation === "create") {
            return [createLifecycleDelta(patchOrMutation as ModelCreateData<M>)];
        }

        if (idOrOperation === "delete") {
            return [deleteLifecycleDelta(patchOrMutation as string)];
        }

        if (typeof patchOrMutation === "function") {
            return draftMutationDeltas(idOrOperation, patchOrMutation as (draft: ModelDraft<M>) => void);
        }

        return patchDeltas(idOrOperation, patchOrMutation as ModelPatch<M>);
    }) as WriteDeltas<M>;

    function createLifecycleDelta(value: ModelCreateData<M>): ModelDelta<M> {
        const {id, updatedAt, ...modelValue} = value as ModelCreateData<M> & Pick<M, "updatedAt">;

        return {
            id: id ?? createId(),
            path: "",
            value: cloneValue(modelValue),
            timestamp: Date.now(),
        };
    }

    function deleteLifecycleDelta(id: string): ModelDelta<M> {
        return {
            id,
            path: "",
            value: undefined,
            timestamp: Date.now(),
        };
    }

    function patchDeltas(id: string, patch: ModelPatch<M>): ModelDelta<M>[] {
        return valueWrites([], patch)
            .filter((write) => !isMetadataPath(write.path))
            .map((write) => ({
                id,
                path: write.path.join(".") as ModelDelta<M>["path"],
                value: cloneValue(write.value),
                timestamp: Date.now(),
            }));
    }

    function draftMutationDeltas(id: string, mutate: (draft: ModelDraft<M>) => void): ModelDelta<M>[] {
        const currentModel = modelsById()[id];
        const original = cloneValue(currentModel ?? {id, updatedAt: 0});
        const draft = cloneValue(original) as ModelDraft<M>;

        mutate(draft);

        return diffPaths(original, draft)
            .filter((write) => !isMetadataPath(write.path))
            .map((write) => ({
                id,
                path: write.path.join(".") as ModelDelta<M>["path"],
                value: cloneValue(write.value),
                timestamp: Date.now(),
            }));
    }
}

function valueWrites(path: string[], value: any): Array<{ path: string[], value: any }> {
    if (!isPlainObject(value)) return [{path, value}];

    const entries = Object.entries(value);
    if (entries.length === 0 && path.length > 0) return [{path, value}];

    return entries.flatMap(([key, child]) => valueWrites([...path, key], child));
}

function isMetadataPath(path: string[]) {
    return path.length === 1 && (path[0] === "id" || path[0] === "updatedAt");
}
