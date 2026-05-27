import {createSignal} from "solid-js";
import {describe, expect, it, vi} from "vitest";
import {Model, ModelData} from "@web/schema";
import {ModelDelta} from "../model/ModelDelta";
import {useDeltaWriter} from "./useDeltaWriter";

interface TestTask extends Model {
    title: string
    status: "todo" | "doing" | "done"
    owner?: {
        name?: string
        location?: string
    }
    tags?: string[]
    checklist?: Array<{
        id: string
        label: string
        done: boolean
    }>
}

describe("useDeltaWriter", () => {
    it("turns a shallow patch object into field deltas", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-18T10:00:00.000Z"));

        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        const deltas = writeDeltas("task-1", {
            title: "Write tests",
            status: "doing",
        });

        expect(deltas).toEqual([
            {
                id: "task-1",
                path: "title",
                value: "Write tests",
                timestamp: Date.now(),
            },
            {
                id: "task-1",
                path: "status",
                value: "doing",
                timestamp: Date.now(),
            },
        ]);

        vi.useRealTimers();
    });

    it("ignores model metadata in patch objects", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        const deltas = writeDeltas("task-1", {
            id: "ignored-id",
            updatedAt: 123,
            title: "Write tests",
        } as Partial<TestTask>);

        expect(deltas).toHaveLength(1);
        expect(deltas[0]).toMatchObject({
            id: "task-1",
            path: "title",
            value: "Write tests",
        });
    });

    it("turns draft mutations into minimal field deltas", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => [
            delta("task-1", "", {title: "Write tests", status: "todo", owner: {name: "Ada", location: "Dublin"}}, 10),
        ]);

        const deltas = writeDeltas("task-1", (draft) => {
            draft.status = "doing";
            draft.owner!.name = "Grace";
            delete draft.owner!.location;
        });

        expect(deltas).toEqual([
            expect.objectContaining({
                id: "task-1",
                path: "status",
                value: "doing",
            }),
            expect.objectContaining({
                id: "task-1",
                path: "owner.name",
                value: "Grace",
            }),
            expect.objectContaining({
                id: "task-1",
                path: "owner.location",
                value: undefined,
            }),
        ]);
    });

    it("uses the latest projected values as the draft mutation base", () => {
        const [deltas, setDeltas] = createSignal<ModelDelta<TestTask>[]>([
            delta("task-1", "", {title: "Initial title", status: "todo"}, 10),
        ]);
        const writeDeltas = useDeltaWriter<TestTask>(deltas);

        setDeltas((current) => [
            ...current,
            delta("task-1", "title", "Current title", 20),
        ]);

        const nextDeltas = writeDeltas("task-1", (draft) => {
            draft.status = "done";
        });

        expect(nextDeltas).toEqual([
            expect.objectContaining({
                id: "task-1",
                path: "status",
                value: "done",
            }),
        ]);
        expect(nextDeltas.some((nextDelta) => nextDelta.path === "title")).toBe(false);
    });

    it("produces a create lifecycle delta with a generated id", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        const [createDelta] = writeDeltas("create", {
            title: "Write tests",
            status: "todo",
        });

        expect(createDelta).toMatchObject({
            path: "",
            value: {
                title: "Write tests",
                status: "todo",
            },
        });
        expect(createDelta.id).toEqual(expect.any(String));
        expect(createDelta.id.length).toBeGreaterThan(0);
        expect(createDelta.timestamp).toEqual(expect.any(Number));
    });

    it("uses a provided id for create lifecycle deltas and keeps it out of the value", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        const deltas = writeDeltas("create", {
            id: "task-1",
            title: "Write tests",
            status: "todo",
        });

        expect(deltas).toEqual([
            expect.objectContaining({
                id: "task-1",
                path: "",
                value: {
                    title: "Write tests",
                    status: "todo",
                },
            }),
        ]);
        expect(deltas[0].value).not.toHaveProperty("id");
    });

    it("produces a delete lifecycle delta", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        const deltas = writeDeltas("delete", "task-1");

        expect(deltas).toEqual([
            expect.objectContaining({
                id: "task-1",
                path: "",
                value: undefined,
            }),
        ]);
    });

    it("uses monotonic timestamps within a single write call", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        const deltas = writeDeltas("task-1", {
            title: "Write tests",
            status: "doing",
            owner: {
                name: "Ada",
            },
        });

        expect(deltas.length).toBeGreaterThan(1);
        for (let index = 1; index < deltas.length; index++) {
            expect(deltas[index].timestamp).toBeGreaterThanOrEqual(deltas[index - 1].timestamp);
        }
    });

    it("enforces required fields for create values at the type level", () => {
        const writeDeltas = useDeltaWriter<TestTask>(() => []);

        writeDeltas("create", {
            title: "Write tests",
            status: "todo",
        } satisfies ModelData<TestTask>);

        // @ts-expect-error status is required for TestTask create values
        writeDeltas("create", {
            title: "Missing status",
        });
    });

    describe("array draft mutations", () => {
        it("turns array push into one create delta with $order after the last item", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                console.log(draft.tags)
                draft.tags!.push("gamma");
            });

            expect(deltas).toHaveLength(1);
            expect(deltas[0].path).toMatch(/^tags\.\$array\.[^.]+$/);
            expect(deltas[0].value).toMatchObject({
                $value: "gamma",
                $order: expect.any(Number),
            });
            expect(deltas[0].value.$order).toBeGreaterThan(20);
        });

        it("turns middle array splice into a create delta with $order between neighbours", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-c", {$order: 30, $value: "charlie"}, 30),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                draft.tags!.splice(1, 0, "bravo");
            });

            expect(deltas).toHaveLength(1);
            expect(deltas[0].path).toMatch(/^tags\.\$array\.[^.]+$/);
            expect(deltas[0].value).toMatchObject({
                $value: "bravo",
                $order: expect.any(Number),
            });
            expect(deltas[0].value.$order).toBeGreaterThan(10);
            expect(deltas[0].value.$order).toBeLessThan(30);
        });

        it("uses a new generated key when creating primitive array items", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
            ]);

            const [newDelta] = writeDeltas("task-1", (draft) => {
                draft.tags!.push("gamma");
            });

            expect(newDelta.path).not.toBe("tags.$array.tag-a");
            expect(newDelta.path).not.toBe("tags.$array.tag-b");
            expect(newDelta.path).toMatch(/^tags\.\$array\.[^.]+$/);
        });

        it("uses an object item's id as its storage key in a create delta with $order", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-c", {$order: 30, id: "item-c", label: "Third", done: false}, 30),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                draft.checklist!.splice(1, 0, {id: "item-b", label: "Second", done: false});
            });

            expect(deltas).toEqual([
                expect.objectContaining({
                    id: "task-1",
                    path: "checklist.$array.item-b",
                    value: {
                        id: "item-b",
                        label: "Second",
                        done: false,
                        $order: expect.any(Number),
                    },
                }),
            ]);
            expect(deltas[0].value.$order).toBeGreaterThan(10);
            expect(deltas[0].value.$order).toBeLessThan(30);
        });

        it("turns array item removal into a delete delta for the stable key", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
                delta("task-1", "tags.$array.tag-c", {$order: 30, $value: "charlie"}, 40),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                draft.tags!.splice(1, 1);
            });

            expect(deltas).toEqual([
                expect.objectContaining({
                    id: "task-1",
                    path: "tags.$array.tag-b",
                    value: undefined,
                }),
            ]);
        });

        it("turns array reorder into update deltas on $order for only the moved item", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
                delta("task-1", "tags.$array.tag-c", {$order: 30, $value: "charlie"}, 40),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                const [moved] = draft.tags!.splice(0, 1);
                draft.tags!.splice(2, 0, moved);
            });

            expect(deltas).toHaveLength(1);
            expect(deltas[0]).toMatchObject({
                id: "task-1",
                path: "tags.$array.tag-a.$order",
                value: expect.any(Number),
            });
            expect(deltas[0].value).toBeGreaterThan(30);
        });

        it("addresses object item field mutations by stable key rather than array index", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-b", {$order: 20, id: "item-b", label: "Second", done: false}, 30),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                draft.checklist![1].done = true;
            });

            expect(deltas).toEqual([
                expect.objectContaining({
                    id: "task-1",
                    path: "checklist.$array.item-b.done",
                    value: true,
                }),
            ]);
            expect(deltas[0].path).not.toContain(".1.");
        });

        it("does not rewrite unchanged array entries when one object item changes", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "checklist.$array.item-a", {$order: 10, id: "item-a", label: "First", done: false}, 20),
                delta("task-1", "checklist.$array.item-b", {$order: 20, id: "item-b", label: "Second", done: false}, 30),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                draft.checklist![1].label = "Second updated";
            });

            expect(deltas).toEqual([
                expect.objectContaining({
                    id: "task-1",
                    path: "checklist.$array.item-b.label",
                    value: "Second updated",
                }),
            ]);
            expect(deltas.some((nextDelta) => nextDelta.path.startsWith("checklist.$array.item-a"))).toBe(false);
            expect(deltas.some((nextDelta) => nextDelta.path === "checklist.$array.item-b")).toBe(false);
        });
    });

    describe("primitive array value mutations", () => {
        it("updates a primitive array item via $value leaf path", () => {
            const writeDeltas = useDeltaWriter<TestTask>(() => [
                delta("task-1", "", {title: "Write tests", status: "todo"}, 10),
                delta("task-1", "tags.$array.tag-a", {$order: 10, $value: "alpha"}, 20),
                delta("task-1", "tags.$array.tag-b", {$order: 20, $value: "beta"}, 30),
            ]);

            const deltas = writeDeltas("task-1", (draft) => {
                draft.tags![0] = "omega";
            });

            expect(deltas).toEqual([
                expect.objectContaining({
                    id: "task-1",
                    path: "tags.$array.tag-a.$value",
                    value: "omega",
                }),
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
