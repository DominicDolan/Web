import {createSignal, flush} from "solid-js";
import {describe, expect, it} from "vitest";
import {Model} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {createModels} from "./createModels";

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

describe("createModels", () => {
    it("projects a create delta with initial values into a visible model", async () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 10,
                title: "Write tests",
                status: "todo",
            },
        ]);
    });

    it("hides a model when the latest lifecycle delta is a delete", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
            delta("task-1", "status", "done", 20),
            delta("task-1", "", undefined, 30),
        ]);

        expect(models).toEqual([]);
    });

    it("restores a model when a create arrives after a delete", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "First title", status: "todo"}, 10),
            delta("task-1", "", undefined, 20),
            delta("task-1", "", {title: "Restored title", status: "doing"}, 30),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 30,
                title: "Restored title",
                status: "doing",
            },
        ]);
    });

    it("applies late-arriving field deltas from before the most recent create", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Initial title", status: "todo"}, 20),
            delta("task-1", "owner.name", "Ada", 10),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 20,
                title: "Initial title",
                status: "todo",
                owner: {
                    name: "Ada",
                },
            },
        ]);
    });

    it("lets create fields supersede older field deltas for the same property", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Initial title", status: "todo"}, 20),
            delta("task-1", "status", "doing", 10),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 20,
                title: "Initial title",
                status: "todo",
            },
        ]);
    });

    it("keeps field deltas from a deleted window ready for a later create", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Initial title", status: "todo"}, 10),
            delta("task-1", "", undefined, 20),
            delta("task-1", "owner.name", "Ada", 30),
            delta("task-1", "", {title: "Restored title", status: "doing"}, 40),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 40,
                title: "Restored title",
                status: "doing",
                owner: {
                    name: "Ada",
                },
            },
        ]);
    });

    it("uses per-property last-write-wins across creates and field deltas", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Create title", status: "todo"}, 10),
            delta("task-1", "title", "Older title", 5),
            delta("task-1", "status", "doing", 15),
            delta("task-1", "title", "Newer title", 20),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 20,
                title: "Newer title",
                status: "doing",
            },
        ]);
    });

    it("applies nested field deltas and deletions by path", () => {
        const [models] = createModels<TestTask>(() => [
            delta("task-1", "", {title: "Initial title", status: "todo"}, 10),
            delta("task-1", "owner.name", "Ada", 20),
            delta("task-1", "owner.name", undefined, 30),
        ]);

        expect(models).toEqual([
            {
                id: "task-1",
                updatedAt: 30,
                title: "Initial title",
                status: "todo",
                owner: {},
            },
        ]);
    });

    it("reacts when the delta accessor changes", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([
            delta("task-1", "", {title: "Initial title", status: "todo"}, 10),
        ]);
        const [models] = createModels<TestTask>(deltas);

        expect(models[0].status).toBe("todo");

        setDeltas((current) => [
            ...current,
            delta<TestTask>("task-1", "status", "done", 20),
        ]);
        flush();

        expect(models[0].status).toBe("done");
        expect(models[0].updatedAt).toBe(20);
    });

    it("handles adding multiple models sequentially", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([]);
        const [models, createDeltas] = createModels<TestTask>(deltas);

        // 1. Add first theme
        const deltas1 = createDeltas("create", {
            id: "theme-1",
            title: "Theme 1",
            status: "todo"
        });
        setDeltas(d => [...d, ...deltas1]);
        flush();

        expect(models.length).toBe(1);
        expect(models[0]).toEqual({
            id: "theme-1",
            title: "Theme 1",
            status: "todo",
            updatedAt: expect.any(Number)
        });

        // 2. Add second theme
        const deltas2 = createDeltas("create", {
            id: "theme-2",
            title: "Theme 2",
            status: "todo"
        });
        setDeltas(d => [...d, ...deltas2]);
        flush();

        expect(models.length).toBe(2);
        expect(models.find(m => m.id === "theme-1")?.title).toBe("Theme 1");
        expect(models.find(m => m.id === "theme-2")?.title).toBe("Theme 2");

        // 3. Add third theme
        const deltas3 = createDeltas("create", {
            id: "theme-3",
            title: "Theme 3",
            status: "todo"
        });
        setDeltas(d => [...d, ...deltas3]);
        flush();

        expect(models.length).toBe(3);
        expect(models.find(m => m.id === "theme-1")?.title).toBe("Theme 1");
        expect(models.find(m => m.id === "theme-2")?.title).toBe("Theme 2");
        expect(models.find(m => m.id === "theme-3")?.title).toBe("Theme 3");
    });


    it("handles deletion and re-addition", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([]);
        const [models, createDeltas] = createModels<TestTask>(deltas);

        // Add 3 themes
        setDeltas(d => [...d, ...createDeltas("create", { id: "t1", title: "T1", status: "todo" })]);
        setDeltas(d => [...d, ...createDeltas("create", { id: "t2", title: "T2", status: "todo" })]);
        setDeltas(d => [...d, ...createDeltas("create", { id: "t3", title: "T3", status: "todo" })]);
        flush();

        expect(models.length).toBe(3);

        // Delete T2
        setDeltas(d => [...d, ...createDeltas("delete", "t2")]);
        flush();

        expect(models.length).toBe(2);
        expect(models.map(m => m.id)).not.toContain("t2");

        // Add T4
        setDeltas(d => [...d, ...createDeltas("create", { id: "t4", title: "T4", status: "todo" })]);
        flush();

        expect(models.length).toBe(3);
        expect(models.map(m => m.id)).toContain("t4");
        expect(models.find(m => m.id === "t4")?.title).toBe("T4");

        // Verify others are still there and not empty
        expect(models.find(m => m.id === "t1")?.title).toBe("T1");
        expect(models.find(m => m.id === "t3")?.title).toBe("T3");
    });

    it("should remain invisible when a field update arrives with a later timestamp than a delete", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([]);
        const [models, createDeltas] = createModels<TestTask>(deltas);

        const id = "t1";

        // 1. Create model at t=10
        const c1 = createDeltas("create", { id, title: "Original", status: "todo" });
        c1[0].timestamp = 10;

        // 2. Delete model at t=20
        const d1 = createDeltas("delete", id);
        d1[0].timestamp = 20;

        // 3. Field update arrives with t=30 (e.g. out of order or late sync)
        // According to the plan: "a model is visible iff there exists at least one create delta with no later delete delta"
        const u1: ModelDelta<TestTask> = {
            id,
            path: "status",
            value: "done",
            timestamp: 30
        };

        setDeltas([...c1, ...d1, u1]);
        flush();

        // EXPECTATION: Model should be invisible because the latest lifecycle delta is a delete (t=20).
        // A field update (t=30) should NOT make it visible.
        const model = models.find(m => m.id === id);
        expect(model, "Model should be undefined even with a later field update").toBeUndefined();
        expect(models.length).toBe(0);
    });

    it("should only reappear if a NEW create delta arrives after the delete delta", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([]);
        const [models, createDeltas] = createModels<TestTask>(deltas);

        const id = "t1";

        // 1. Create (t=10)
        const c1 = createDeltas("create", { id, title: "V1", status: "todo" });
        c1[0].timestamp = 10;

        // 2. Delete (t=20)
        const d1 = createDeltas("delete", id);
        d1[0].timestamp = 20;

        // 3. Re-create (t=30)
        const c2 = createDeltas("create", { id, title: "V2", status: "doing" });
        c2[0].timestamp = 30;

        setDeltas([...c1, ...d1, ...c2]);
        flush();

        expect(models.length).toBe(1);
        expect(models[0].title).toBe("V2");
    });

    it("reproduces 'phantom' empty models after deletion and addition of new items", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([]);
        const [models, createDeltas] = createModels<TestTask>(deltas);

        // Add T1, T2
        setDeltas(d => [...d, ...createDeltas("create", { id: "t1", title: "T1", status: "todo" })]);
        setDeltas(d => [...d, ...createDeltas("create", { id: "t2", title: "T2", status: "todo" })]);
        flush();

        // Delete T1
        setDeltas(d => [...d, ...createDeltas("delete", "t1")]);
        flush();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe("t2");

        // Add T3
        setDeltas(d => [...d, ...createDeltas("create", { id: "t3", title: "T3", status: "todo" })]);
        flush();

        // The user reports seeing "empty" items or data from previous items.
        // We check if all models in the list have their mandatory fields.
        models.forEach(m => {
            expect(m.title, `Model ${m.id} should not be empty`).not.toBeUndefined();
        });

        expect(models.length).toBe(2);
    });

    describe("keyed arrays", () => {
        it("projects keyed primitive array entries as arrays sorted by order", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 20),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 30),
            ]);

            expect(models[0].tags).toEqual(["alpha", "beta"]);
        });

        it("projects keyed object array entries without exposing storage metadata", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-b", {$order: 20, id: "item-b", label: "Second", done: false}, 20),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: true}, 30),
            ]);

            expect(models[0].checklist).toEqual([
                {id: "item-a", label: "First", done: true},
                {id: "item-b", label: "Second", done: false},
            ]);
        });

        it("removes keyed array entries with tombstone-style deltas", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
                delta("task-1", "tags.$array.tag-b", undefined, 40),
            ]);

            expect(models[0].tags).toEqual(["alpha"]);
        });

        it("applies nested field deltas to keyed object array entries by stable key", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-a.done", true, 30),
            ]);

            expect(models[0].checklist).toEqual([
                {id: "item-a", label: "First", done: true},
            ]);
        });

        it("updates primitive array item value via $value leaf path", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-a.$value", "omega", 30),
            ]);

            expect(models[0].tags).toEqual(["omega"]);
        });

        it("updates array item order via $order leaf path", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
                delta("task-1", "tags.$array.tag-a.$order", 25, 40),
            ]);

            expect(models[0].tags).toEqual(["beta", "alpha"]);
        });


        it("ignores deltas to keyed object array entries when the timestamp is behind", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-a.done", true, 30),
                delta("task-1", "checklist.$array.item-a.done", false, 25),
            ]);

            expect(models[0].checklist).toEqual([
                {id: "item-a", label: "First", done: true},
            ]);
        });

        it("applies field deltas to object array entries with out of order deltas", () => {
            const [models] = createModels<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a.done", true, 30),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
            ]);

            expect(models[0].checklist).toEqual([
                {id: "item-a", label: "First", done: true},
            ]);
        });

        it("reacts to updates in keyed arrays when deltas are pushed", () => {
            const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
            ]);
            const [models] = createModels<TestTask>(deltas);

            expect(models[0].tags).toEqual(["alpha"]);

            // Push new delta to add a tag
            setDeltas(current => [
                ...current,
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
            ]);
            flush();

            expect(models[0].tags).toEqual(["alpha", "beta"]);

            // Push delta to reorder tag-a
            setDeltas(current => [
                ...current,
                delta("task-1", "tags.$array.tag-a.$order", 25, 40),
            ]);
            flush();

            expect(models[0].tags).toEqual(["beta", "alpha"]);

            // Push delta to update tag-a value
            setDeltas(current => [
                ...current,
                delta("task-1", "tags.$array.tag-a.$value", "omega", 50),
            ]);
            flush();

            expect(models[0].tags).toEqual(["beta", "omega"]);

            // Push delta to remove tag-b
            setDeltas(current => [
                ...current,
                delta("task-1", "tags.$array.tag-b", undefined, 60),
            ]);
            flush();

            expect(models[0].tags).toEqual(["omega"]);
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
