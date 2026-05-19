import {Accessor, createMemo} from "solid-js";
import {Model, PartialModel} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {cloneValue, isPlainObject} from "../utils/ObjectUtils";

type ProjectedModel<M extends Model, Valid extends boolean> = Valid extends true ? M : PartialModel<M>
type ProjectedModelsById<M extends Model, Valid extends boolean> = Record<string, ProjectedModel<M, Valid>>

export function createModelsById<M extends Model, Valid extends boolean = true>(
    deltas: Accessor<readonly ModelDelta<M>[]>,
    _opts?: { assumeValid: Valid },
): Accessor<ProjectedModelsById<M, Valid>> {
    return createMemo(() => {
        const grouped = new Map<string, ModelDelta<M>[]>();

        for (const delta of deltas()) {
            const group = grouped.get(delta.id);
            if (group == null) {
                grouped.set(delta.id, [delta]);
            } else {
                group.push(delta);
            }
        }

        const modelsById: Record<string, PartialModel<M>> = {};

        for (const [id, unsortedDeltas] of grouped) {
            const idDeltas = [...unsortedDeltas].sort((a, b) => a.timestamp - b.timestamp);
            let latestCreate = -Infinity;
            let latestDelete = -Infinity;

            for (const delta of idDeltas) {
                if (delta.path !== "") continue;

                if (delta.value === undefined) {
                    latestDelete = Math.max(latestDelete, delta.timestamp);
                } else {
                    latestCreate = Math.max(latestCreate, delta.timestamp);
                }
            }

            if (latestCreate === -Infinity || latestDelete > latestCreate) continue;

            const model = {id, updatedAt: latestCreate} as PartialModel<M>;
            const writeTimestamps = new Map<string, number>();

            for (const delta of idDeltas) {
                if (delta.path === "") {
                    if (delta.value === undefined) continue;

                    for (const write of valueWrites([], delta.value)) {
                        applyWrite(model, write.path, write.value, delta.timestamp, writeTimestamps);
                    }
                } else {
                    applyWrite(model, splitPath(delta.path), delta.value, delta.timestamp, writeTimestamps);
                }
            }

            model.updatedAt = Math.max(
                latestCreate,
                ...[...writeTimestamps.values()],
            );
            modelsById[id] = model;
        }

        return modelsById as ProjectedModelsById<M, Valid>;
    });
}

export function createModels<M extends Model, Valid extends boolean = true>(
    deltas: Accessor<readonly ModelDelta<M>[]>,
    opts?: { assumeValid: Valid },
): Accessor<Array<ProjectedModel<M, Valid>>> {
    const modelsById = createModelsById(deltas, opts);

    return createMemo(() => Object.values(modelsById()) as Array<ProjectedModel<M, Valid>>);
}

function splitPath(path: string): string[] {
    return path.split(".").filter(Boolean);
}

function applyWrite(
    model: Record<string, any>,
    path: string[],
    value: any,
    timestamp: number,
    writeTimestamps: Map<string, number>,
) {
    if (path.length === 0) return;

    const pathKey = path.join(".");
    const existingTimestamp = writeTimestamps.get(pathKey);
    if (existingTimestamp != null && existingTimestamp > timestamp) return;

    writeTimestamps.set(pathKey, timestamp);
    setByPath(model, path, value);
}

function setByPath(obj: Record<string, any>, path: string[], value: any) {
    let nestedObj = obj;

    for (let i = 0; i < path.length - 1; i++) {
        const part = path[i];

        if (nestedObj[part] == null || typeof nestedObj[part] !== "object" || Array.isArray(nestedObj[part])) {
            if (value === undefined) return;
            nestedObj[part] = {};
        }

        nestedObj = nestedObj[part];
    }

    const key = path.at(-1)!;
    if (value === undefined) {
        delete nestedObj[key];
    } else {
        nestedObj[key] = cloneValue(value);
    }
}

function valueWrites(path: string[], value: any): Array<{ path: string[], value: any }> {
    if (!isPlainObject(value)) return [{path, value}];

    const entries = Object.entries(value)
        .filter(([key]) => key !== "id" && key !== "updatedAt");

    if (entries.length === 0 && path.length > 0) return [{path, value}];

    return entries.flatMap(([key, child]) => valueWrites([...path, key], child));
}

