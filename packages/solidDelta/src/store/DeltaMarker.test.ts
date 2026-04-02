import {ModelDelta} from "../model/ModelDelta";
import {Model} from "@web/schema";
import {createDeltaStore} from "./DeltaStore";
import {describe, it, expect} from "vitest";
import {flush} from "solid-js";
import {createMarker} from "./DeltaMarker";

interface TestUser extends Model {
    username?: string
    location?: string
    age?: number
}

function milliseconds(milliseconds: number) {
    return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}

describe('createMarker', () => {
    it('should throw if the store is not created via createDeltaStore', () => {
        const fakeStore = {} as any;
        expect(() => createMarker(fakeStore)).toThrow("The Store provided to createMarker has to be created with createDeltaStore.");
    });

    describe('Snapshot mode (mark without arguments)', () => {
        it('should return no deltas immediately after being marked', async () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);
            mark();

            expect(await getMarked()).toHaveLength(0);
        });

        it('should return only deltas added after being marked', async () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            await mark();

            setUsers((s) => {
                s["user-1"].username = "bob";
            });
            flush();

            const marked = await getMarked();
            expect(marked).toHaveLength(1);
            expect(marked[0].value).toBe("bob");
        });

        it('should return multiple new deltas across different IDs and paths', async () => {
            const store = createDeltaStore<TestUser>(() => []);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            await mark();

            setUsers((s) => {
                s["user-1"] = { username: "alice", location: "wonderland" };
                s["user-2"] = { username: "bob" };
            });
            flush();

            const marked = await getMarked();
            // user-1: username, location; user-2: username. Total 3 deltas.
            expect(marked).toHaveLength(3);
        });

        it('should return only the most recent delta for the same path if multiple are added after mark()', async () => {
            const store = createDeltaStore<TestUser>(() => []);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            await mark();

            setUsers((s) => { s["user-1"] = { username: "alice" }; });
            flush();

            setUsers((s) => { s["user-1"].username = "bob"; });
            flush();

            const marked = await getMarked();
            expect(marked).toHaveLength(1);
            expect(marked[0].value).toBe("bob");
        });

        it('should return the most recent delta for each unique id and path in Snapshot mode', async () => {
            const store = createDeltaStore<TestUser>(() => []);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            await mark();

            setUsers((s) => {
                s["user-1"] = { username: "alice", location: "wonderland" };
                s["user-1"].username = "bob";
                s["user-2"] = { username: "charlie" };
            });
            flush();

            const marked = await getMarked();
            // user-1.username (bob), user-1.location (wonderland), user-2.username (charlie)
            expect(marked).toHaveLength(3);
            expect(marked.find(d => d.id === "user-1" && d.path === "username")?.value).toBe("bob");
        });

        it('should handle re-marking correctly', async () => {
            const store = createDeltaStore<TestUser>(() => []);
            const [, setUsers] = store;
            const [getMarked, mark] = createMarker(store);

            await mark();

            setUsers((s) => { s["user-1"] = { username: "alice" }; });
            flush();

            expect(await getMarked()).toHaveLength(1);

            await mark(); // Record current state

            expect(await getMarked()).toHaveLength(0);

            setUsers((s) => { s["user-1"].username = "bob"; });
            flush();

            const secondMarked = await getMarked();
            expect(secondMarked).toHaveLength(1);
            expect(secondMarked[0].value).toBe("bob");
        });

        it('should return only the latest delta if mark() was never called (baseline is 0)', async () => {
             const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" },
                { id: "user-1", timestamp: 200, path: "username", value: "bob" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked] = createMarker(store);

            const marked = await getMarked();
            expect(marked).toHaveLength(1);
            expect(marked[0].value).toBe("bob");
        });
    });

    describe('Timestamp mode (mark with timestamp)', () => {
        it('should return only the most recent delta for each path with timestamp greater than the baseline', async () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" },
                { id: "user-1", timestamp: 200, path: "username", value: "bob" },
                { id: "user-1", timestamp: 300, path: "username", value: "charlie" },
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            await mark(150);
            const marked = await getMarked();

            expect(marked).toHaveLength(1);
            expect(marked[0].value).toBe("charlie");
            expect(marked.every(d => d.timestamp > 150)).toBe(true);
        });

        it('should return nothing if all deltas are older than or equal to the baseline', async () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            await mark(100);
            expect(await getMarked()).toHaveLength(0);

            await mark(150);
            expect(await getMarked()).toHaveLength(0);
        });

        it('should switch back to snapshot mode if mark() is called without arguments', async () => {
            const deltas: ModelDelta<TestUser>[] = [
                { id: "user-1", timestamp: 100, path: "username", value: "alice" }
            ];
            const store = createDeltaStore(() => deltas);
            const [getMarked, mark] = createMarker(store);

            await mark(50); // Timestamp mode
            expect(await getMarked()).toHaveLength(1);

            await mark(); // Switch to Snapshot mode
            expect(await getMarked()).toHaveLength(0);
        });
    });
});

describe('createMarker with async store', () => {

    it('should work when store is initialized with an async factory', async () => {
        const deltas: ModelDelta<TestUser>[] = [
            { id: "user-1", timestamp: 100, path: "username", value: "alice" }
        ];

        // Initialize with a promise
        const store = createDeltaStore(() => new Promise<ModelDelta<TestUser>[]>(resolve => {
            setTimeout(() => resolve(deltas), 50);
        }));

        const [getMarked, mark] = createMarker(store);

        // Wait for the store to actually populate
        await milliseconds(60)
        flush();

        await mark();

        expect(await getMarked()).toHaveLength(0);

        // Add a new delta after marking
        const [, setUsers] = store;
        setUsers((s) => {
            s["user-1"].username = "bob";
        });
        flush();

        expect(await getMarked()).toHaveLength(1);
    });

    it('should work when store is initialized with an async factory and mark is called immediately', async () => {
        const deltas: ModelDelta<TestUser>[] = [
            { id: "user-1", timestamp: 100, path: "username", value: "alice" }
        ];

        // Initialize with a promise
        const store = createDeltaStore(() => milliseconds(50).then(() => deltas));

        const [getMarked, mark] = createMarker(store);

        await mark()

        await new Promise(resolve => setTimeout(resolve, 60));
        expect(await getMarked()).toHaveLength(0);

        // Add a new delta after marking
        const [, setUsers] = store;
        setUsers((s) => {
            s["user-1"].username = "bob";
        });
        flush();

        expect(await getMarked()).toHaveLength(1);
    });
})

describe('createMarker with deletions', () => {
    it('should track deletion of a single property', async () => {
        const store = createDeltaStore<TestUser>(() => []);
        const [, setUsers] = store;
        const [getMarked, mark] = createMarker(store);

        setUsers((s) => {
            s["user-1"] = {username: "alice", location: "wonderland"};
        });
        flush();

        await mark();

        setUsers((s) => {
            delete s["user-1"].location;
        });
        flush();

        const marked = await getMarked();
        expect(marked).toHaveLength(1);
        expect(marked[0].id).toBe("user-1");
        expect(marked[0].path).toBe("location");
        expect(marked[0].value).toBe(undefined);
    });

    it('should track deletion of an entire model', async () => {
        const store = createDeltaStore<TestUser>(() => []);
        const [, setUsers] = store;
        const [getMarked, mark] = createMarker(store);

        setUsers((s) => {
            s["user-1"] = {username: "alice"};
        });
        flush();

        await mark();

        setUsers((s) => {
            delete s["user-1"];
        });
        flush();

        const marked = await getMarked();
        expect(marked).toHaveLength(1);
        expect(marked[0].id).toBe("user-1");
        expect(marked[0].path).toBe("");
        expect(marked[0].value).toBe(undefined);
    });

    it('should return deletion deltas only after mark() is called', async () => {
        const deltas: ModelDelta<TestUser>[] = [
            {id: "user-1", timestamp: 100, path: "username", value: "alice"}
        ];
        const store = createDeltaStore(() => deltas);
        const [, setUsers] = store;
        const [getMarked, mark] = createMarker(store);

        await mark();

        setUsers((s) => {
            delete s["user-1"];
        });
        flush();

        const marked = await getMarked();
        expect(marked).toHaveLength(1);
        expect(marked[0].value).toBe(undefined);
    });

    it('should track multiple deletions across different models', async () => {
        const store = createDeltaStore<TestUser>(() => []);
        const [, setUsers] = store;
        const [getMarked, mark] = createMarker(store);

        setUsers((s) => {
            s["user-1"] = {username: "alice", location: "wonderland"};
            s["user-2"] = {username: "bob", age: 30};
        });
        flush();

        await mark();

        setUsers((s) => {
            delete s["user-1"].location;
            delete s["user-2"].age;
        });
        flush();

        const marked = await getMarked();
        expect(marked).toHaveLength(2);
        expect(marked.every(d => d.value === undefined)).toBe(true);
    });

    it('should handle deletion followed by re-creation correctly', async () => {
        const store = createDeltaStore<TestUser>(() => []);
        const [, setUsers] = store;
        const [getMarked, mark] = createMarker(store);

        setUsers((s) => {
            s["user-1"] = {username: "alice"};
        });
        flush();

        await mark();

        setUsers((s) => {
            delete s["user-1"];
        });
        flush();

        await new Promise(resolve => setTimeout(resolve, 0));

        setUsers((s) => {
            s["user-1"] = {username: "bob"};
        });
        flush();

        const marked = await getMarked();
        // Should have deletion delta and then re-creation delta, but only most recent per path

        await new Promise(resolve => setTimeout(resolve, 10));
        expect(marked).toHaveLength(2);
        expect(marked[1].path).toBe("username");
        expect(marked[1].value).toBe("bob");
    });
});


