import {ModelDelta} from "../model/ModelDelta";
import {Model} from "@web/schema";
import {createDeltaStore} from "./DeltaStore";
import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {flush} from "solid-js";
import {createMarker} from "./DeltaMarker";

interface TestUser extends Model {
    username?: string
    location?: string
    age?: number
}

describe('createMarker', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should throw if the store is not created via createDeltaStore', () => {
        const fakeStore = {} as any;
        expect(() => createMarker(fakeStore)).toThrow("The Store provided to createMarker has to be created with createDeltaStore.");
    });

    describe('Snapshot mode (mark without arguments)', () => {
        it('should return no deltas immediately after being marked', () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            mark();
            expect(getMarked()).toHaveLength(0);
        });

        it('should return only deltas added after being marked', () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            mark();

            setUsers((s) => {
                s["user-1"].username = "bob";
            });
            flush();

            const marked = getMarked();
            expect(marked).toHaveLength(1);
            expect(marked[0].value).toBe("bob");
        });

        it('should return multiple new deltas across different IDs and paths', () => {
            const store = createDeltaStore<TestUser>(() => []);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            mark();

            setUsers((s) => {
                s["user-1"] = { username: "alice", location: "wonderland" };
                s["user-2"] = { username: "bob" };
            });
            flush();

            const marked = getMarked();
            // user-1: username, location; user-2: username. Total 3 deltas.
            expect(marked).toHaveLength(3);
        });

        it('should handle re-marking correctly', () => {
            const store = createDeltaStore<TestUser>(() => []);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            mark();
            setUsers((s) => { s["user-1"] = { username: "alice" }; });
            flush();

            expect(getMarked()).toHaveLength(1);

            vi.advanceTimersByTime(1);
            mark(); // Record current state
            expect(getMarked()).toHaveLength(0);

            setUsers((s) => { s["user-1"].username = "bob"; });
            flush();

            const secondMarked = getMarked();
            expect(secondMarked).toHaveLength(1);
            expect(secondMarked[0].value).toBe("bob");
        });

        it('should return all deltas if mark() was never called (baseline is 0)', () => {
             const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked] = createMarker(store);

            expect(getMarked()).toHaveLength(1);
        });
    });

    describe('Timestamp mode (mark with timestamp)', () => {
        it('should return only deltas with timestamp greater than the baseline', () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" },
                { id: "user-1", timestamp: 200, path: "location", value: "wonderland" },
                { id: "user-1", timestamp: 300, path: "age", value: 25 },
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            mark(150);
            const marked = getMarked();

            expect(marked).toHaveLength(2);
            expect(marked.every(d => d.timestamp > 150)).toBe(true);
        });

        it('should return nothing if all deltas are older than or equal to the baseline', () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            mark(100);
            expect(getMarked()).toHaveLength(0);

            mark(150);
            expect(getMarked()).toHaveLength(0);
        });

        it('should switch back to snapshot mode if mark() is called without arguments', () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            mark(50); // Timestamp mode
            expect(getMarked()).toHaveLength(1);

            mark(); // Switch to Snapshot mode
            expect(getMarked()).toHaveLength(0);
        });
    });
});
