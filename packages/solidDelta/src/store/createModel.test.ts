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
});

function delta<M extends Model>(
    id: string,
    path: ModelDelta<M>["path"],
    value: ModelDelta<M>["value"],
    timestamp: number,
): ModelDelta<M> {
    return {id, path, value, timestamp};
}
