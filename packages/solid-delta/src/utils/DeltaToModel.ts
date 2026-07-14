import {Model, PartialModel} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {cloneValue} from "./ObjectUtils";

function insertItemByOrder<T>(arr: {v: T, o: number}[], item: T, order: number) {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = (left + right) >>> 1;
        if (arr[mid].o <= order) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    arr.splice(left, 0, {v: item, o: order});
}

export function applyUpdateDeltaWithoutArraysToModel<M extends Model>(model: PartialModel<M>, delta: ModelDelta<M>) {
    if (delta.path === "") {
        throw new Error("Expected update delta but received lifecycle delta")
    }

    if (delta.path.includes("$array")) {
        throw new Error("Expected delta without array operations")
    }

    const path = delta.path.split(".");
    const value = delta.value;

    let nestedObj = model as any;

    for (let i = 0; i < path.length - 1; i++) {
        const part = path[i];

        if (part === "$array") {
            continue
        }

        const isArrayKey = path[i - 1] === "$array"

        if (isArrayKey) {

        }

        if (nestedObj[part] == null || typeof nestedObj[part] !== "object" || Array.isArray(nestedObj[part])) {
            // console.log("for path, part", path, part, "nestedObject", nestedObj, "obj", obj)
            if (value === undefined) return;
            const nextPart = path[i + 1];
            if (nextPart === "$array") {
                nestedObj[part] = []
            } else {
                nestedObj[part] = {};
            }
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

export function applyUpdateDeltaWithArraysToMap<M extends Model>(map: Map<string, Map<string, { o?: number, v: any }>>, delta: ModelDelta<M>) {
    let pos = delta.path.lastIndexOf("$array");
    if (pos === -1) {
        throw new Error("Expected delta with array operations")
    }

    const arrayKey = delta.path.slice(0, pos).replace(/\.$/, "")

    let tagMap = map.get(arrayKey)
    if (tagMap == null) {
        tagMap = new Map()
        map.set(arrayKey, tagMap)
    }

    const nextPathSegment = delta.path.replace(arrayKey + ".$array", "");

    if (nextPathSegment.startsWith(".")) {
        const path = nextPathSegment.slice(1).split(".");
        const [tag, orderOrValueOrKeyOrUndefined] = path
        if (orderOrValueOrKeyOrUndefined == undefined) {
            if (delta.value == undefined) {
                tagMap.delete(tag)
            } else if ("$value" in delta.value) {
                tagMap.set(tag, {o: delta.value.$order, v: delta.value.$value})
            } else {
                const value = structuredClone(delta.value)
                delete value.$order

                tagMap.set(tag, {o: delta.value.$order, v: value})
            }
        } else if (orderOrValueOrKeyOrUndefined === "$order") {
            const element = tagMap.get(tag)
            if (element != null) {
                element.o = delta.value;
            } else {
                tagMap.set(tag, {o: delta.value, v: undefined})
            }
        } else if (orderOrValueOrKeyOrUndefined === "$value") {
            const element = tagMap.get(tag)
            if (element != null) {
                element.v = delta.value;
            } else {
                tagMap.set(tag, {o: undefined, v: delta.value})
            }
        } else {
            const element = tagMap.get(tag)
            if (element != null) {
                element.v[orderOrValueOrKeyOrUndefined] = delta.value;
            } else {
                tagMap.set(tag, {o: undefined, v: {[orderOrValueOrKeyOrUndefined]: delta.value}})
            }
        }
    } else {
        throw new Error(`The delta path ${delta.path} is not valid. Paths must not end with $array`)
    }
}
