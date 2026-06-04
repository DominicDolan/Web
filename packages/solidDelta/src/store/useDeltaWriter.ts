import {Accessor} from "solid-js";
import {Model, ModelData} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {diffPaths} from "../utils/diffPaths";
import {createId} from "@paralleldrive/cuid2";
import {cloneValue, isPlainObject} from "../utils/ObjectUtils";
import {createModel} from "./createModels.ts";

type ModelCreateData<M extends Model> = ModelData<M> & Partial<Pick<M, "id">>
type ModelPatch<M extends Model> = Partial<M>
type ModelDraft<M extends Model> = M
type ValueWrite = { path: string[], value: any }
type ArrayItemSnapshot = { key: string, order?: number, value: any, timestamp: number }
type ArraySnapshot = Record<string, ArrayItemSnapshot[]>

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
        const currentDeltas = deltas().filter(delta => delta.id === id);
        const currentModel = createModel(currentDeltas);
        const original = cloneValue(currentModel ?? {id, updatedAt: 0});
        const draft = cloneValue(original) as ModelDraft<M>;

        mutate(draft);

        const arrayPaths = getArrayPaths(original, draft);
        const arrayPathKeys = new Set(arrayPaths.map((path) => path.join(".")));
        const arraySnapshot = createArraySnapshot(currentDeltas);
        const arrayDiffs = arrayPaths.flatMap((path) => arrayDeltas(path, original, draft, arraySnapshot));
        const diffs = diffPaths(original, draft)
            .filter((write) => !arrayPathKeys.has(write.path.join(".")))
            .filter((write) => !isMetadataPath(write.path))

        return [...diffs, ...arrayDiffs].map((write) => ({
            id,
            path: write.path.join(".") as ModelDelta<M>["path"],
            value: cloneValue(write.value),
            timestamp: Date.now(),
        }));
    }
}

function valueWrites(path: string[], value: any): ValueWrite[] {
    if (!isPlainObject(value)) return [{path, value}];

    const entries = Object.entries(value);
    if (entries.length === 0 && path.length > 0) return [{path, value}];

    return entries.flatMap(([key, child]) => valueWrites([...path, key], child));
}

function isMetadataPath(path: string[]) {
    return path.length === 1 && (path[0] === "id" || path[0] === "updatedAt");
}

function createArraySnapshot<M extends Model>(deltas: readonly ModelDelta<M>[]): ArraySnapshot {
    const snapshot: ArraySnapshot = {};

    for (const delta of [...deltas].sort((a, b) => a.timestamp - b.timestamp)) {
        const parts = delta.path.split(".");
        const arrayIndex = parts.indexOf("$array");
        if (arrayIndex === -1) continue;

        const arrayPath = parts.slice(0, arrayIndex).join(".");
        const key = parts[arrayIndex + 1];
        const fieldPath = parts.slice(arrayIndex + 2);
        if (key == null) continue;

        snapshot[arrayPath] ??= [];
        let item = snapshot[arrayPath].find((candidate) => candidate.key === key);

        if (fieldPath.length === 0 && delta.value === undefined) {
            snapshot[arrayPath] = snapshot[arrayPath].filter((candidate) => candidate.key !== key);
            continue;
        }

        if (item == null) {
            item = {key, value: undefined, timestamp: delta.timestamp};
            snapshot[arrayPath].push(item);
        }

        if (delta.timestamp < item.timestamp) continue;
        item.timestamp = delta.timestamp;

        if (fieldPath.length === 0) {
            item.order = delta.value.$order;
            item.value = "$value" in delta.value
                ? delta.value.$value
                : objectWithoutOrder(delta.value);
        } else if (fieldPath[0] === "$order") {
            item.order = delta.value;
        } else if (fieldPath[0] === "$value") {
            item.value = delta.value;
        } else {
            if (!isPlainObject(item.value)) item.value = {};
            setObjectPath(item.value, fieldPath, delta.value);
        }
    }

    for (const path in snapshot) {
        snapshot[path].sort((a, b) => (a.order ?? Number.MAX_VALUE) - (b.order ?? Number.MAX_VALUE));
    }

    return snapshot;
}

function arrayDeltas(path: string[], original: any, draft: any, snapshot: ArraySnapshot): ValueWrite[] {
    const pathKey = path.join(".");
    const originalArray = getObjectPath(original, path) ?? [];
    const draftArray = getObjectPath(draft, path) ?? [];
    const originalItems = snapshot[pathKey] ?? originalArray.map((value: any, index: number) => ({
        key: itemKey(value),
        order: (index + 1) * 10,
        value,
        timestamp: 0,
    }));
    const matches = matchArrayItems(originalItems, draftArray);
    const writes: ValueWrite[] = [];

    for (const item of originalItems) {
        if (!matches.some((match) => match.original?.key === item.key)) {
            writes.push({path: [...path, "$array", item.key], value: undefined});
        }
    }

    const originalExistingKeys = originalItems
        .filter((item) => matches.some((match) => match.original?.key === item.key))
        .map((item) => item.key);
    const finalExistingKeys = matches
        .filter((match) => match.original != null)
        .map((match) => match.original!.key);
    const stableKeys = new Set(longestCommonSubsequence(originalExistingKeys, finalExistingKeys));

    const assignedOrders = new Map<string, number>();
    for (let index = 0; index < matches.length; index++) {
        const match = matches[index];
        const key = match.original?.key ?? itemKey(match.value);

        if (match.original == null) {
            const order = orderBetween(previousOrder(matches, assignedOrders, index), nextOrder(matches, index));
            assignedOrders.set(key, order);
            writes.push({path: [...path, "$array", key], value: arrayCreateValue(match.value, order)});
            continue;
        }

        if (!stableKeys.has(match.original.key)) {
            const order = orderBetween(previousOrder(matches, assignedOrders, index), nextOrder(matches, index));
            assignedOrders.set(match.original.key, order);
            writes.push({path: [...path, "$array", match.original.key, "$order"], value: order});
        } else if (match.original.order != null) {
            assignedOrders.set(match.original.key, match.original.order);
        }

        writes.push(...arrayItemValueDeltas([...path, "$array", match.original.key], match.original.value, match.value));
    }

    return writes;
}

function matchArrayItems(originalItems: ArrayItemSnapshot[], draftArray: any[]) {
    const used = new Set<string>();

    return draftArray.map((value, index) => {
        const key = itemKey(value);
        let original = originalItems.find((item) => item.key === key && !used.has(item.key));

        if (original == null) {
            original = originalItems.find((item) => !used.has(item.key) && valuesEqual(item.value, value));
        }

        if (
            original == null &&
            originalItems.length === draftArray.length &&
            originalItems[index] != null &&
            !used.has(originalItems[index].key)
        ) {
            original = originalItems[index];
        }

        if (original != null) used.add(original.key);
        return {original, value};
    });
}

function arrayItemValueDeltas(path: string[], original: any, value: any): ValueWrite[] {
    if (!isPlainObject(original) || !isPlainObject(value)) {
        return valuesEqual(original, value) ? [] : [{path: [...path, "$value"], value}];
    }

    return diffPaths(original, value)
        .filter((write) => !isMetadataPath(write.path))
        .map((write) => ({path: [...path, ...write.path], value: write.value}));
}

function getArrayPaths(left: any, right: any, path: string[] = []): string[][] {
    if (Array.isArray(left) || Array.isArray(right)) return [path];
    if (!isPlainObject(left) && !isPlainObject(right)) return [];

    const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
    return [...keys].flatMap((key) => getArrayPaths(left?.[key], right?.[key], [...path, key]));
}

function getObjectPath(value: any, path: string[]) {
    return path.reduce((current, key) => current?.[key], value);
}

function setObjectPath(value: any, path: string[], childValue: any) {
    let current = value;
    for (let index = 0; index < path.length - 1; index++) {
        current[path[index]] ??= {};
        current = current[path[index]];
    }
    current[path[path.length - 1]] = childValue;
}

function objectWithoutOrder(value: any) {
    const {$order, ...rest} = value;
    return rest;
}

function arrayCreateValue(value: any, order: number) {
    return isPlainObject(value)
        ? {...cloneValue(value), $order: order}
        : {$order: order, $value: cloneValue(value)};
}

function itemKey(value: any) {
    return isPlainObject(value) && typeof value.id === "string" ? value.id : createId();
}

function orderBetween(left?: number, right?: number) {
    if (left == null && right == null) return 10;
    if (left == null) return right! - 10;
    if (right == null) return left + 10;
    return left + (right - left) / 2;
}

function previousOrder(matches: Array<{ original?: ArrayItemSnapshot, value: any }>, assigned: Map<string, number>, index: number) {
    for (let cursor = index - 1; cursor >= 0; cursor--) {
        const previous = matches[cursor].original;
        if (previous == null) continue;
        return assigned.get(previous.key) ?? previous.order;
    }
}

function nextOrder(matches: Array<{ original?: ArrayItemSnapshot, value: any }>, index: number) {
    for (let cursor = index + 1; cursor < matches.length; cursor++) {
        const next = matches[cursor].original;
        if (next?.order != null) return next.order;
    }
}

function longestCommonSubsequence(left: string[], right: string[]) {
    const lengths = Array.from({length: left.length + 1}, () => Array(right.length + 1).fill(0));

    for (let i = left.length - 1; i >= 0; i--) {
        for (let j = right.length - 1; j >= 0; j--) {
            lengths[i][j] = left[i] === right[j]
                ? lengths[i + 1][j + 1] + 1
                : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
        }
    }

    const result: string[] = [];
    for (let i = 0, j = 0; i < left.length && j < right.length;) {
        if (left[i] === right[j]) {
            result.push(left[i]);
            i++;
            j++;
        } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
            i++;
        } else {
            j++;
        }
    }

    return result;
}

function valuesEqual(left: any, right: any) {
    return JSON.stringify(left) === JSON.stringify(right);
}
