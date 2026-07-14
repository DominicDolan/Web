import {describe, expect, it} from "vitest";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {createModel} from "./createModels";

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

interface TestTypeface extends Model {
    id: string;
    css: string;
    applyAsDefault: string[];
}

describe("createModel", () => {
    it("projects a create delta with initial values into a visible model", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 10,
            title: "Write tests",
            status: "todo",
        });
    });

    it("returns undefined when the latest lifecycle delta is a delete", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
            delta("task-1", "status", "done", 20),
            delta("task-1", "", undefined, 30),
        ]);

        expect(model).toBeUndefined();
    });

    it("restores a model when a create arrives after a delete", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "First title", status: "todo"}, 10),
            delta("task-1", "", undefined, 20),
            delta("task-1", "", {title: "Restored title", status: "doing"}, 30),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 30,
            title: "Restored title",
            status: "doing",
        });
    });

    it("applies late-arriving field deltas from before the most recent create", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Initial title", status: "todo"}, 20),
            delta("task-1", "owner.name", "Ada", 10),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 20,
            title: "Initial title",
            status: "todo",
            owner: {
                name: "Ada",
            },
        });
    });

    it("lets create fields supersede older field deltas for the same property", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Initial title", status: "todo"}, 20),
            delta("task-1", "status", "doing", 10),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 20,
            title: "Initial title",
            status: "todo",
        });
    });

    it("keeps field deltas from a deleted window ready for a later create", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Initial title", status: "todo"}, 10),
            delta("task-1", "", undefined, 20),
            delta("task-1", "owner.name", "Ada", 30),
            delta("task-1", "", {title: "Restored title", status: "doing"}, 40),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 40,
            title: "Restored title",
            status: "doing",
            owner: {
                name: "Ada",
            },
        });
    });

    it("uses per-property last-write-wins across creates and field deltas", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Create title", status: "todo"}, 10),
            delta("task-1", "title", "Older title", 5),
            delta("task-1", "status", "doing", 15),
            delta("task-1", "title", "Newer title", 20),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 20,
            title: "Newer title",
            status: "doing",
        });
    });

    it("applies nested field deltas and deletions by path", () => {
        const model = createModel<TestTask>([
            delta("task-1", "", {title: "Initial title", status: "todo"}, 10),
            delta("task-1", "owner.name", "Ada", 20),
            delta("task-1", "owner.name", undefined, 30),
        ]);

        expect(model).toEqual({
            id: "task-1",
            updatedAt: 30,
            title: "Initial title",
            status: "todo",
            owner: {},
        });
    });

    describe("keyed arrays", () => {
        it("projects keyed primitive array entries as arrays sorted by order", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 20),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 30),
            ]);

            expect(model?.tags).toEqual(["alpha", "beta"]);
        });

        it("projects keyed object array entries without exposing storage metadata", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-b", {$order: 20, id: "item-b", label: "Second", done: false}, 20),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: true}, 30),
            ]);

            expect(model?.checklist).toEqual([
                {id: "item-a", label: "First", done: true},
                {id: "item-b", label: "Second", done: false},
            ]);
        });

        it("removes keyed array entries with tombstone-style deltas", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
                delta("task-1", "tags.$array.tag-b", undefined, 40),
            ]);

            expect(model?.tags).toEqual(["alpha"]);
        });

        it("applies nested field deltas to keyed object array entries by stable key", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-a.done", true, 30),
            ]);

            expect(model?.checklist).toEqual([
                {id: "item-a", label: "First", done: true},
            ]);
        });

        it("updates primitive array item value via $value leaf path", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-a.$value", "omega", 30),
            ]);

            expect(model?.tags).toEqual(["omega"]);
        });

        it("updates array item order via $order leaf path", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
                delta("task-1", "tags.$array.tag-a.$order", 25, 40),
            ]);

            expect(model?.tags).toEqual(["beta", "alpha"]);
        });

        it("ignores deltas to keyed object array entries when the timestamp is behind", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-a.done", true, 30),
                delta("task-1", "checklist.$array.item-a.done", false, 25),
            ]);

            expect(model?.checklist).toEqual([
                {id: "item-a", label: "First", done: true},
            ]);
        });

        it("applies field deltas to object array entries with out of order deltas", () => {
            const model = createModel<TestTask>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a.done", true, 30),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
            ]);

            expect(model?.checklist).toEqual([
                {id: "item-a", label: "First", done: true},
            ]);
        });
    });

    describe("createModel - Error checking", () => {
        const id = "typeface-1";

        it("should not crash when updating a primitive array element", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "body { color: red }", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.key-0", value: { $order: 10, $value: "div" }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.key-0.$value", value: "span", timestamp: 30 },
            ];

            const model = createModel<TestTypeface>(deltas);
            expect(model?.applyAsDefault).toEqual(["span"]);
        });

        it("should not crash when an array is mutated from a state that isn't perfectly synced", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "body { color: red }", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.some-key.$value", value: "span", timestamp: 20 },
            ];

            const model = createModel<TestTypeface>(deltas);
            expect(model?.applyAsDefault).toEqual(["span"]);
        });

        it("should handle mixed primitive and object array-like projections", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "body { color: red }", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.key-0", value: { $order: 10, $value: "div" }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.key-0.someField", value: "someValue", timestamp: 30 },
            ];

            const model = createModel<TestTypeface>(deltas);
            expect(model).toBeDefined();
        });

        it("should test for potential out-of-bounds or undefined access in applyArrayMapToModel", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "body { color: red }", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.key-0", value: { $order: 10, $value: undefined }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.key-0.$value", value: "span", timestamp: 30 },
            ];

            const model = createModel<TestTypeface>(deltas);
            expect(model?.applyAsDefault).toEqual(["span"]);
        });

        it("should check if deleting and then updating an element causes the error", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "body { color: red }", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.key-0", value: { $order: 10, $value: "div" }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.key-0", value: undefined, timestamp: 30 },
                { id, path: "applyAsDefault.$array.key-0.$value", value: "span", timestamp: 40 },
            ];

            const model = createModel<TestTypeface>(deltas);
            expect(model?.applyAsDefault).toEqual(["span"]);
        });

        it("should not crash when multiple arrays are present and one is updated", () => {
            interface MultiArrayModel extends Model {
                id: string;
                arr1: string[];
                arr2: string[];
            }
            const deltas: ModelDelta<MultiArrayModel>[] = [
                { id, path: "", value: { id, arr1: [], arr2: [] }, timestamp: 10 },
                { id, path: "arr1.$array.k1", value: { $order: 10, $value: "a" }, timestamp: 20 },
                { id, path: "arr2.$array.k2", value: { $order: 10, $value: "b" }, timestamp: 30 },
                { id, path: "arr1.$array.k1.$value", value: "a2", timestamp: 40 },
            ];
            const model = createModel<MultiArrayModel>(deltas);
            expect(model?.arr1).toEqual(["a2"]);
            expect(model?.arr2).toEqual(["b"]);
        });

        it("should not crash when a value is updated to an object and then to a primitive", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.k1", value: { $order: 10, $value: { name: "obj" } }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.k1.$value", value: "primitive", timestamp: 30 },
            ];
            const model = createModel<TestTypeface>(deltas);
            expect(model?.applyAsDefault).toEqual(["primitive"]);
        });

        it("should not crash when a value is updated to a primitive and then to an object", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.k1", value: { $order: 10, $value: "primitive" }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.k1.someField", value: "objValue", timestamp: 30 },
            ];
            const model = createModel<TestTypeface>(deltas);
            // This should handle the case where $value was a string but a field update comes in
            expect(model).toBeDefined();
        });

        it("should not crash when array indices are shifted via order updates", () => {
            const deltas: ModelDelta<TestTypeface>[] = [
                { id, path: "", value: { id, css: "", applyAsDefault: [] }, timestamp: 10 },
                { id, path: "applyAsDefault.$array.k1", value: { $order: 10, $value: "a" }, timestamp: 20 },
                { id, path: "applyAsDefault.$array.k2", value: { $order: 20, $value: "b" }, timestamp: 30 },
                { id, path: "applyAsDefault.$array.k2.$order", value: 5, timestamp: 40 },
            ];
            const model = createModel<TestTypeface>(deltas);
            expect(model?.applyAsDefault).toEqual(["b", "a"]);
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
