import {describe, expect, it} from "vitest";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {applyUpdateDeltaWithoutArraysToModel, applyUpdateDeltaWithArraysToMap} from "./DeltaToModel";

interface TestTask extends Model {
    title: string
    status: "todo" | "doing" | "done"
    owner?: {
        name?: string
    }
    tags?: string[]
    checklist?: Array<{
        id: string
        label: string
        done: boolean
    }>
}

describe("DeltaToModel Utils", () => {
    describe("applyUpdateDeltaWithoutArraysToModel", () => {
        it("applies a basic field update", () => {
            const model: any = {id: "task-1"};
            applyUpdateDeltaWithoutArraysToModel<TestTask>(model, delta("task-1", "title", "New Title", 10));
            expect(model.title).toBe("New Title");
        });

        it("applies a nested field update", () => {
            const model: any = {id: "task-1"};
            applyUpdateDeltaWithoutArraysToModel<TestTask>(model, delta("task-1", "owner.name", "Ada", 10));
            expect(model.owner).toEqual({name: "Ada"});
        });

        it("throws when receiving a delta with $array", () => {
            const model: any = {id: "task-1"};
            expect(() => {
                applyUpdateDeltaWithoutArraysToModel<TestTask>(model, delta("task-1", "tags.$array.tag-a", { $order: 1, $value: "a" }, 10));
            }).toThrow("Expected delta without array operations");
        });
    });

    describe("applyUpdateDeltaWithArraysToMap", () => {
        it("populates the map with keyed primitive array entries", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a", { $order: 10, $value: "alpha" }, 10));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-b", { $order: 20, $value: "beta" }, 20));

            const tagsArray = map.get("tags");
            expect(tagsArray).toBeDefined();
            expect(tagsArray!.get("tag-a")).toEqual({ o: 10, v: "alpha" });
            expect(tagsArray!.get("tag-b")).toEqual({ o: 20, v: "beta" });
        });

        it("populates the map with keyed object array entries", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "checklist.$array.item-a", { $order: 10, id: "item-a", label: "First" }, 10));

            const checklistArray = map.get("checklist");
            expect(checklistArray!.get("item-a")).toEqual({ o: 10, v: {id: "item-a", label: "First" }});
        });

        it("merges field updates for existing array items in the map", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "checklist.$array.item-a", { $order: 10, id: "item-a", done: false }, 10));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "checklist.$array.item-a.done", true, 20));

            const checklistArray = map.get("checklist");
            expect(checklistArray!.get("item-a")).toEqual({ o: 10, v: {id: "item-a", done: true }});
        });

        it("updates internal reserved fields like $order and $value", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a", { $order: 10, $value: "alpha" }, 10));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a.$order", 15, 20));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a.$value", "omega", 30));

            const tagsArray = map.get("tags");
            expect(tagsArray!.get("tag-a")).toEqual({ o: 15, v: "omega" });
        });

        it("updates multiple items' $order to change their relative positions", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a", { $order: 10, $value: "alpha" }, 10));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-b", { $order: 20, $value: "beta" }, 20));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-c", { $order: 30, $value: "gamma" }, 30));

            // Reorder: move 'gamma' between 'alpha' and 'beta'
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-c.$order", 15, 40));

            const tagsArray = map.get("tags");
            expect(tagsArray!.get("tag-a")?.o).toBe(10);
            expect(tagsArray!.get("tag-c")?.o).toBe(15);
            expect(tagsArray!.get("tag-b")?.o).toBe(20);
        });

        it("handles tombstones by setting the item to undefined in the map", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a", { $order: 10, $value: "alpha" }, 10));
            applyUpdateDeltaWithArraysToMap<TestTask>(map, delta("task-1", "tags.$array.tag-a", undefined, 20));

            const tagsArray = map.get("tags");
            expect(tagsArray!.has("tag-a")).toBe(false);
        });

        it("handles nested arrays using the full path as the map key", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            // projects is a hypothetical array in a more complex model
            const nestedPath = "projects.$array.p1.tasks.$array.t1";
            applyUpdateDeltaWithArraysToMap<any>(map, delta("task-1", nestedPath, { $order: 1, title: "Nested Task" }, 10));

            // The array path should be everything before the last $array
            expect(map.has("projects.$array.p1.tasks")).toBe(true);
            const nestedArray = map.get("projects.$array.p1.tasks");
            expect(nestedArray!.get("t1")).toEqual({ o: 1, v: {title: "Nested Task" }});

            // Also test a deeper field update
            applyUpdateDeltaWithArraysToMap<any>(map, delta("task-1", "projects.$array.p1.tasks.$array.t1.done", true, 20));
            expect(nestedArray!.get("t1")?.v.done).toBe(true);
        });

        it("correctly identifies the array path when multiple $array segments are present", () => {
            const map = new Map<string, Map<string, { o: number, v: any }>>();

            // Update an item in the outer array
            applyUpdateDeltaWithArraysToMap<any>(map, delta("task-1", "projects.$array.p1.name", "Project 1", 10));
            // Update an item in the inner array
            applyUpdateDeltaWithArraysToMap<any>(map, delta("task-1", "projects.$array.p1.tasks.$array.t1.title", "Task 1", 20));

            expect(map.has("projects")).toBe(true);
            expect(map.has("projects.$array.p1.tasks")).toBe(true);

            expect(map.get("projects")!.get("p1")?.v.name).toBe("Project 1");
            expect(map.get("projects.$array.p1.tasks")!.get("t1")?.v.title).toBe("Task 1");
        });
    });
});

function delta<M extends Model>(
    id: string,
    path: ModelDelta<M>["path"],
    value: ModelDelta<M>["value"],
    timestamp: number,
): ModelDelta<M> {
    return {id, path, value, timestamp};
}
