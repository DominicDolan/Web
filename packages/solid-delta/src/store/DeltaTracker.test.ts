import {Model} from "@web/schema";
import {createMemo, flush, refresh} from "solid-js";
import {describe, expect, it} from "vitest";
import {ModelDelta} from "../model/ModelDelta";
import {createDeltaTracker} from "./DeltaTracker";

interface TestTheme extends Model {
    name?: string
    description?: string
    color?: string
}

const name1 = { id: "theme-1", path: "name", value: "N", timestamp: 1 } satisfies ModelDelta<TestTheme>;
const name2 = { id: "theme-1", path: "name", value: "Ne", timestamp: 2 } satisfies ModelDelta<TestTheme>;
const name3 = { id: "theme-1", path: "name", value: "New", timestamp: 3 } satisfies ModelDelta<TestTheme>;
const name4 = { id: "theme-1", path: "name", value: "New!", timestamp: 4 } satisfies ModelDelta<TestTheme>;
const description4 = { id: "theme-1", path: "description", value: "Hello", timestamp: 4 } satisfies ModelDelta<TestTheme>;
const description7 = { id: "theme-1", path: "description", value: "Hello again", timestamp: 7 } satisfies ModelDelta<TestTheme>;
const theme2Name3 = { id: "theme-2", path: "name", value: "Other", timestamp: 3 } satisfies ModelDelta<TestTheme>;

describe("createDeltaTracker", () => {
    it("starts with no tracked deltas and compacted untracked deltas", () => {
        const deltas = [name1, name2, name3, description4, theme2Name3];
        const acked = createDeltaTracker<TestTheme>(() => deltas);

        expect(acked.get()).toEqual([]);
        expect(acked.inverse()).toEqual([name3, description4, theme2Name3]);
    });

    it("marks a single delta as the timestamp frontier for its key", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, name3, description4]);

        acked.mark(name2);

        expect(acked.get()).toEqual([name2]);
        expect(acked.get({ suppressCompaction: true })).toEqual([name1, name2]);
        expect(acked.inverse()).toEqual([name3, description4]);
    });

    it("marks a batch using the maximum timestamp per key", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, name3, description4, description7]);

        acked.mark([name1, name3, description4]);

        expect(acked.get()).toEqual([name3, description4]);
        expect(acked.inverse()).toEqual([description7]);
    });

    it("does not move a frontier backwards when an older delta is marked later", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, name3]);

        acked.mark(name3);
        acked.mark(name1);

        expect(acked.get()).toEqual([name3]);
        expect(acked.inverse()).toEqual([]);
    });

    it("returns raw tracked and raw untracked deltas when compaction is suppressed", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, name3, name4]);

        acked.mark(name2);

        expect(acked.get({ suppressCompaction: true })).toEqual([name1, name2]);
        expect(acked.inverse({ suppressCompaction: true })).toEqual([name3, name4]);
        expect(acked.inverse()).toEqual([name4]);
    });

    it("treats keys without frontiers as untracked and omits them from get", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, description4]);

        acked.mark(name2);

        expect(acked.get()).toEqual([name2]);
        expect(acked.inverse()).toEqual([description4]);
    });

    it("resolves older superseded writes after the compacted latest write is marked", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, name3]);
        const batch = acked.inverse();

        expect(batch).toEqual([name3]);

        acked.mark(batch);

        expect(acked.inverse()).toEqual([]);
        expect(acked.inverse({ suppressCompaction: true })).toEqual([]);
        expect(acked.get({ suppressCompaction: true })).toEqual([name1, name2, name3]);
    });

    it("does not acknowledge edits added while a save is in flight", () => {
        const deltas = [name1, name2, name3];
        const acked = createDeltaTracker<TestTheme>(() => deltas);
        const batch = acked.inverse();

        expect(batch).toEqual([name3]);

        deltas.push(name4);
        acked.mark(batch);

        expect(acked.get()).toEqual([name3]);
        expect(acked.inverse()).toEqual([name4]);
    });

    it("keeps frontiers isolated by model id and path", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, name3, description4, theme2Name3]);

        acked.mark(name3);

        expect(acked.get()).toEqual([name3]);
        expect(acked.inverse()).toEqual([description4, theme2Name3]);
    });

    it("supports marking server-loaded deltas as already acknowledged", () => {
        const serverDeltas = [name1, name2, description4];
        const localName = name3;
        const deltas = [...serverDeltas];
        const acked = createDeltaTracker<TestTheme>(() => deltas);

        acked.mark(serverDeltas);
        expect(acked.inverse()).toEqual([]);

        deltas.push(localName);
        expect(acked.inverse()).toEqual([localName]);
    });

    it("treats late-arriving server deltas at or before the frontier as already tracked", () => {
        const deltas = [name3];
        const acked = createDeltaTracker<TestTheme>(() => deltas);

        acked.mark(name3);
        deltas.unshift(name1, name2);

        expect(acked.get({ suppressCompaction: true })).toEqual([name1, name2, name3]);
        expect(acked.inverse()).toEqual([]);
    });

    it("returns late-arriving server deltas after the frontier until explicitly marked", () => {
        const deltas = [name2];
        const acked = createDeltaTracker<TestTheme>(() => deltas);

        acked.mark(name2);
        deltas.push(name4);

        expect(acked.inverse()).toEqual([name4]);

        acked.mark(name4);

        expect(acked.inverse()).toEqual([]);
    });

    it("allows partial save success by marking only acknowledged deltas", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, description4, theme2Name3]);
        const batch = acked.inverse();

        expect(batch).toEqual([name2, description4, theme2Name3]);

        acked.mark([name2]);

        expect(acked.get()).toEqual([name2]);
        expect(acked.inverse()).toEqual([description4, theme2Name3]);
    });

    it("treats same-key same-timestamp deltas as the same frontier point", () => {
        const firstNameAt2 = { id: "theme-1", path: "name", value: "First", timestamp: 2 } satisfies ModelDelta<TestTheme>;
        const secondNameAt2 = { id: "theme-1", path: "name", value: "Second", timestamp: 2 } satisfies ModelDelta<TestTheme>;
        const acked = createDeltaTracker<TestTheme>(() => [name1, firstNameAt2, secondNameAt2, name3]);

        acked.mark(firstNameAt2);

        expect(acked.get({ suppressCompaction: true })).toEqual([name1, firstNameAt2, secondNameAt2]);
        expect(acked.inverse({ suppressCompaction: true })).toEqual([name3]);
    });

    it("tracks lifecycle deltas under the model-level key without marking field deltas", () => {
        const createTheme = { id: "theme-1", path: "", value: { name: "New" }, timestamp: 1 } satisfies ModelDelta<TestTheme>;
        const deleteTheme = { id: "theme-1", path: "", value: undefined, timestamp: 5 } satisfies ModelDelta<TestTheme>;
        const fieldDelta = { id: "theme-1", path: "name", value: "Renamed", timestamp: 3 } satisfies ModelDelta<TestTheme>;
        const acked = createDeltaTracker<TestTheme>(() => [createTheme, fieldDelta, deleteTheme]);

        acked.mark(deleteTheme);

        expect(acked.get()).toEqual([deleteTheme]);
        expect(acked.inverse()).toEqual([fieldDelta]);
    });

    it("uses a custom trackBy consistently for get, inverse, and mark", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, description4, description7], {
            trackBy: delta => delta.id
        });

        acked.mark(name2);

        expect(acked.get()).toEqual([name2]);
        expect(acked.inverse()).toEqual([description7]);

        acked.mark(description7);

        expect(acked.get()).toEqual([description7]);
        expect(acked.inverse()).toEqual([]);
    });

    it("clear removes all frontiers", () => {
        const acked = createDeltaTracker<TestTheme>(() => [name1, name2, description4]);

        acked.mark([name2, description4]);
        expect(acked.inverse()).toEqual([]);

        acked.clear();

        expect(acked.get()).toEqual([]);
        expect(acked.inverse()).toEqual([name2, description4]);
    });

    it("updates derived Solid memos when the delta source or tracker frontier changes", () => {
        const deltas = [name1, name2];
        const deltaMemo = createMemo(() => [...deltas]);
        const acked = createDeltaTracker<TestTheme>(() => deltaMemo());
        const unsaved = createMemo(() => acked.inverse());
        const hasUnsavedChanges = createMemo(() => unsaved().length > 0);

        expect(unsaved()).toEqual([name2]);
        expect(hasUnsavedChanges()).toBe(true);

        acked.mark(unsaved());
        flush();

        expect(unsaved()).toEqual([]);
        expect(hasUnsavedChanges()).toBe(false);

        deltas.push(name3);
        refresh(deltaMemo);
        flush();

        expect(unsaved()).toEqual([name3]);
        expect(hasUnsavedChanges()).toBe(true);
    });
});
