import {createStore, produce, reconcile} from "solid-js/store"
import {createEvent, createKeyedEvent, EventListener, KeyedEventListener} from "@web/utils"
import {
    Model,
    ModelData,
    PartialModel,
    ModelDelta,
    ModelDeltaCreate,
    ModelDeltaDelete
} from "@web/schema";
import {createId} from "@paralleldrive/cuid2";

export type ModelPushDeltaUpdate<M extends Model> = {
    modelId: string
    timestamp: number
    type: "update"
    payload: [keyof M, ...(string | number | object)[]] | Partial<M>
}

export type ModelPushDelta<M extends Model> = ModelDeltaCreate<M> | ModelPushDeltaUpdate<M> | ModelDeltaDelete<M>

export type DeltaMachinePush<M extends Model> = {
    (action: "create", deltaPayload: Partial<ModelData<M>>): M;
    (action: "delete", modelId: string, ...path: (string | number)[]): M;
    (modelId: string, ...args: any[]): M;
}

export type DeltaMachine<M extends Model> = {
    models: M[],
    push: DeltaMachinePush<M>,
    mark: (label: string, timestamp?: number) => void,
    getUnmarkedDeltas: (label: string) => ModelDelta<M>[],
    deleteMarked: (label: string) => void,
    getModelById: (id: string) => M | undefined,
    getStreamById: (id: string) => ModelDelta<M>[] | undefined,
    getIds: () => string[],
    pushMany: (deltas: ModelPushDelta<M>[]) => void,
    on: {
        modelCreate: EventListener<[PartialModel<M>]>[0]
        modelUpdate: EventListener<[PartialModel<M>]>[0]
        modelDelete: EventListener<[string]>[0]
        anyDeltaPush: EventListener<[ModelDelta<M>[]]>[0]
        newDeltas: EventListener<[ModelDelta<M>[]]>[0]
        modelUpdateById: KeyedEventListener<[PartialModel<M>]>[0]
    }
}

export type ModelRecord<M extends Model> = Record<string, ModelDelta<M>[]>
export type InitialModelRecord<M extends Model> = Record<string, ModelPushDelta<M>[]>

function insertValueByTimestamp<M extends Model>(arr: ModelDelta<M>[], el: ModelDelta<M>) {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = (left + right) >>> 1;
        if (arr[mid].timestamp <= el.timestamp) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    arr.splice(left, 0, el);
}

// Helper to expand objects into path arrays
function expandObjectToPaths(obj: any, prefix: (string | number)[] = []): Array<(string | number)[]> {
    const paths: Array<(string | number)[]> = [];

    for (const key in obj) {
        const value = obj[key];
        const currentPath = [...prefix, key];

        if (value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
            // Recursively expand nested objects
            paths.push(...expandObjectToPaths(value, currentPath));
        } else {
            // Leaf value - add the value at the end of the path
            paths.push([...currentPath, value]);
        }
    }

    return paths;
}

// Helper to expand array indices in paths
function expandArrayIndices(path: any[]): Array<any[]> {
    // Find array of indices in the path
    let arrayIndex = -1;
    for (let i = 0; i < path.length; i++) {
        if (Array.isArray(path[i])) {
            arrayIndex = i;
            break;
        }
    }

    if (arrayIndex === -1) {
        return [path];
    }

    const indices = path[arrayIndex] as number[];
    const before = path.slice(0, arrayIndex);
    const after = path.slice(arrayIndex + 1);

    return indices.flatMap(index => {
        const newPath = [...before, index, ...after];
        return expandArrayIndices(newPath);
    });
}

// Apply a path-based update to a model
function applyPathToModel<M extends Model>(model: any, path: (string | number)[]): any {
    if (path.length === 0) return model;
    if (path.length === 1) return path[0]; // Just the value

    const result = model ? {...model} : {};
    const value = path[path.length - 1];
    const keys = path.slice(0, -1);

    let current: any = result;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || current[key] === null) {
            current[key] = typeof keys[i + 1] === 'number' ? [] : {};
        } else {
            current[key] = Array.isArray(current[key]) ? [...current[key]] : {...current[key]};
        }
        current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;

    return result;
}

// Delete a path from a model
function deletePathFromModel<M extends Model>(model: any, path: (string | number)[]): any {
    if (path.length === 0) return undefined;

    const result = {...model};
    let current: any = result;

    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (current[key] === undefined) return result;
        current[key] = Array.isArray(current[key]) ? [...current[key]] : {...current[key]};
        current = current[key];
    }

    const lastKey = path[path.length - 1];
    delete current[lastKey];

    return result;
}

// Reduce deltas to build a model
function reduceDeltasToModel<M extends Model>(deltas: ModelDelta<M>[]): M | null {
    if (deltas.length === 0) return null;

    const sorted = [...deltas].sort((a, b) => a.timestamp - b.timestamp);
    let model: any = null;

    for (const delta of sorted) {
        if (delta.type === "create") {
            model = {
                id: delta.modelId,
                updatedAt: delta.timestamp,
                ...delta.payload
            };
        } else if (delta.type === "update") {
            if (model === null) continue;

            const path = delta.payload as any;
            if (Array.isArray(path)) {
                model = applyPathToModel(model, path);
            } else {
                // Legacy format - merge payload as object
                model = {...model, ...delta.payload};
            }
            model.updatedAt = delta.timestamp;
        } else if (delta.type === "delete") {
            const path = delta.payload as any;
            if (!Array.isArray(path) || path.length === 0) {
                model = null;
            } else {
                model = deletePathFromModel(model, path);
                model.updatedAt = delta.timestamp;
            }
        }
    }

    return model as M;
}

export function createDeltaMachine<M extends Model>(initialDeltas?: InitialModelRecord<M>): DeltaMachine<M> {
    const [deltaStreams, setDeltaStreams] = createStore<Record<string, ModelDelta<M>[]>>({});
    const [modelsById, setModelsById] = createStore<Record<string, M>>({});
    const [modelsList, setModelsList] = createStore<M[]>([]);

    // Delta marking system
    const deltaMarks = new Map<string, Set<string>>(); // deltaId -> Set<labels>

    // Events
    const [onModelCreate, triggerModelCreate] = createEvent<[PartialModel<M>]>();
    const [onModelUpdate, triggerModelUpdate] = createEvent<[PartialModel<M>]>();
    const [onModelDelete, triggerModelDelete] = createEvent<[string]>();
    const [onAnyDeltaPush, triggerAnyDeltaPush] = createEvent<[ModelDelta<M>[]]>();
    const [onNewDeltas, triggerNewDeltas] = createEvent<[ModelDelta<M>[]]>();
    const [onModelUpdateById, triggerModelUpdateById] = createKeyedEvent<[PartialModel<M>]>();

    // Tracking marked deltas
    const markedTimestamps = new Map<string, number>(); // label -> timestamp

    function getDeltaId(delta: ModelDelta<M>): string {
        // For update/delete, payload IS the path; for create, payload is the model
        const path = (delta.type === "update" || delta.type === "delete") ? delta.payload : null;
        const pathStr = path ? JSON.stringify(path) : '';
        return `${delta.modelId}:${delta.timestamp}:${delta.type}:${pathStr}`;
    }

    function pushManyInternal(deltas: ModelDelta<M>[], triggerEvents = true) {
        const grouped: Record<string, ModelDelta<M>[]> = {};

        for (const delta of deltas) {
            if (!grouped[delta.modelId]) {
                grouped[delta.modelId] = [];
            }
            grouped[delta.modelId].push(delta);
        }

        for (const modelId in grouped) {
            const modelDeltas = grouped[modelId];
            const existingStream = deltaStreams[modelId] || [];
            const newStream = [...existingStream];

            for (const delta of modelDeltas) {
                insertValueByTimestamp(newStream, delta);
            }

            setDeltaStreams(modelId, newStream);

            // Rebuild model from deltas
            const model = reduceDeltasToModel(newStream);
            const wasNew = !modelsById[modelId];

            if (model === null) {
                // Model was deleted
                setModelsById(produce((models) => {
                    delete models[modelId];
                }));

                const index = modelsList.findIndex(m => m.id === modelId);
                if (index !== -1) {
                    setModelsList(produce((list) => list.splice(index, 1)));
                }

                if (triggerEvents) {
                    triggerModelDelete(modelId);
                }
            } else {
                setModelsById(modelId, reconcile(model));

                const index = modelsList.findIndex(m => m.id === modelId);
                if (index === -1) {
                    setModelsList(modelsList.length, model);
                } else {
                    setModelsList(index, reconcile(model));
                }

                if (triggerEvents) {
                    if (wasNew) {
                        triggerModelCreate(model);
                    }
                    triggerModelUpdate(model);
                    triggerModelUpdateById(modelId, model);
                }
            }
        }

        if (triggerEvents) {
            triggerAnyDeltaPush(deltas);

            // Trigger new deltas - only include deltas that are not marked
            const newDeltas = deltas.filter(d => {
                const deltaId = getDeltaId(d);
                const marks = deltaMarks.get(deltaId);
                // If the delta has ANY marks, it's not new
                return !marks || marks.size === 0;
            });

            if (newDeltas.length > 0) {
                triggerNewDeltas(newDeltas);
            }
        }
    }

    function push(action: "create", deltaPayload: Partial<ModelData<M>>): M;
    function push(action: "delete", modelId: string, ...path: (string | number)[]): M;
    function push(modelId: string, ...args: any[]): M;
    function push(arg1: string, ...args: any[]): M {
        if (arg1 === "create") {
            const payload = args[0] as Partial<ModelData<M>>;
            const modelId = (payload as any).id || createId();
            const delta: ModelDelta<M> = {
                modelId,
                timestamp: Date.now(),
                type: "create",
                payload: {...payload, id: modelId} as Partial<M>
            };

            pushManyInternal([delta]);
            const model = modelsById[modelId];
            if (!model) throw new Error(`Failed to create model ${modelId}`);
            return model;
        } else if (arg1 === "delete") {
            const modelId = args[0] as string;
            const path = args.slice(1) as (string | number)[];

            // Check if model exists
            if (!deltaStreams[modelId]) {
                throw new Error(`Cannot delete non-existent model: ${modelId}`);
            }

            const delta: ModelDelta<M> = {
                modelId,
                timestamp: Date.now(),
                type: "delete",
                payload: path as any
            };

            pushManyInternal([delta]);
            const model = modelsById[modelId];
            if (!model && path.length === 0) {
                // Full delete - return a placeholder
                return {id: modelId} as M;
            }
            if (!model) throw new Error(`Model ${modelId} was deleted`);
            return model;
        } else {
            // Update: push(modelId, ...args)
            const modelId = arg1;

            // Check if model exists
            if (!deltaStreams[modelId]) {
                throw new Error(`Cannot update non-existent model: ${modelId}`);
            }

            const deltas: ModelDelta<M>[] = [];

            // Detect the pattern
            if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0])) {
                // push(modelId, {username: "alice", age: 30})
                const obj = args[0];
                const paths = expandObjectToPaths(obj);

                const timestamp = Date.now();
                for (const path of paths) {
                    const delta: ModelDelta<M> = {
                        modelId,
                        timestamp,
                        type: "update",
                        payload: path as any
                    };
                    deltas.push(delta);
                }
            } else {
                // push(modelId, "profile", "name", "John") or push(modelId, "arr", [0, 2], "val", true)
                let path = args;

                // Expand array indices if present
                const expandedPaths = expandArrayIndices(path);
                const timestamp = Date.now();

                for (const expandedPath of expandedPaths) {
                    const delta: ModelDelta<M> = {
                        modelId,
                        timestamp,
                        type: "update",
                        payload: expandedPath as any
                    };
                    deltas.push(delta);
                }
            }

            pushManyInternal(deltas);
            const model = modelsById[modelId];
            if (!model) throw new Error(`Model ${modelId} was deleted`);
            return model;
        }
    }

    function mark(label: string, timestamp?: number) {
        const ts = timestamp ?? Date.now();
        markedTimestamps.set(label, ts);

        // Mark all deltas up to this timestamp
        for (const modelId in deltaStreams) {
            const stream = deltaStreams[modelId];
            for (const delta of stream) {
                if (delta.timestamp <= ts) {
                    const deltaId = getDeltaId(delta);
                    if (!deltaMarks.has(deltaId)) {
                        deltaMarks.set(deltaId, new Set());
                    }
                    deltaMarks.get(deltaId)!.add(label);
                }
            }
        }
    }

    function getUnmarkedDeltas(label: string): ModelDelta<M>[] {
        const unmarked: ModelDelta<M>[] = [];

        for (const modelId in deltaStreams) {
            const stream = deltaStreams[modelId];
            for (const delta of stream) {
                const deltaId = getDeltaId(delta);
                const marks = deltaMarks.get(deltaId);
                if (!marks || !marks.has(label)) {
                    unmarked.push(delta);
                }
            }
        }

        return unmarked.sort((a, b) => a.timestamp - b.timestamp);
    }

    function deleteMarked(label: string) {
        const toDelete = new Set<string>();

        for (const modelId in deltaStreams) {
            const stream = deltaStreams[modelId];
            for (const delta of stream) {
                const deltaId = getDeltaId(delta);
                const marks = deltaMarks.get(deltaId);
                if (marks && marks.has(label)) {
                    toDelete.add(modelId);
                }
            }
        }

        // Delete entire streams for marked models
        setDeltaStreams(produce((streams) => {
            for (const modelId of toDelete) {
                delete streams[modelId];
            }
        }));

        // Also delete from models
        setModelsById(produce((models) => {
            for (const modelId of toDelete) {
                delete models[modelId];
            }
        }));

        setModelsList(produce((list) => {
            return list.filter(m => !toDelete.has(m.id));
        }));
    }

    // Initialize with initial deltas
    if (initialDeltas) {
        const allDeltas: ModelDelta<M>[] = [];
        for (const modelId in initialDeltas) {
            allDeltas.push(...initialDeltas[modelId]);
        }
        pushManyInternal(allDeltas, false);
    }

    return {
        models: modelsList,
        push: push as DeltaMachinePush<M>,
        mark,
        getUnmarkedDeltas,
        deleteMarked,
        getModelById(id: string): M | undefined {
            return modelsById[id];
        },
        getStreamById(id: string): ModelDelta<M>[] | undefined {
            return deltaStreams[id];
        },
        getIds(): string[] {
            return Object.keys(deltaStreams);
        },
        pushMany(deltas: ModelDelta<M>[]) {
            pushManyInternal(deltas);
        },
        on: {
            modelCreate: onModelCreate,
            modelUpdate: onModelUpdate,
            modelDelete: onModelDelete,
            anyDeltaPush: onAnyDeltaPush,
            newDeltas: onNewDeltas,
            modelUpdateById: onModelUpdateById
        }
    };
}
