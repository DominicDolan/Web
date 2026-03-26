import {ModelDelta} from "../model/ModelDelta";
import {Model} from "@web/schema";
import {createDeltaStore} from "./DeltaStore";
import {describe, it, expect} from "vitest";
import {createMemo, flush, refresh} from "solid-js";
import {createMarker} from "./DeltaMarker";

interface TestUser extends Model {
    username?: string
    location?: string
    age?: number
    profile?: {
        name?: string
        settings?: {
            theme?: string
            notifications?: boolean
        }
    }
    userProfiles?: Array<{
        enabled?: boolean
        name?: string
    }>
}

describe('DeltaStore reading', () => {
    it('should update based on provided path', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "username",
                value: "newUsername"
            }
        ]

        const [users] = createDeltaStore(() => deltas);

        expect(users[0].username).toBe("newUsername");
    });

    it('should update based on provided path with nested object', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "profile.name",
                value: "newName"
            }
        ]

        const [users] = createDeltaStore(() => deltas);
        expect(users[0].profile?.name).toBe("newName");
    })

    it('should update based on provided path with nested array', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "userProfiles.0.name",
                value: "newName"
            }
        ]

        const [users] = createDeltaStore(() => deltas);
        expect(users[0].userProfiles?.[0]?.name).toBe("newName");
    })

    it('should update the models when a provided memo is updated', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "username",
                value: "newUsername"
            }
        ];

        const memo = createMemo(() => {
            return [...deltas];
        });

        const [users] = createDeltaStore(() => memo());
        expect(users[0].username).toBe("newUsername");

        deltas.push({
            id: "some-id",
            timestamp: 200,
            path: "username",
            value: "newerUsername"
        });

        refresh(memo)
        flush()

        expect(users[0].username).toBe("newerUsername");
    });

    it('should update the models when a provided async memo is updated', async () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "username",
                value: "newUsername"
            }
        ];

        const memo = createMemo(() => {
            return new Promise<ModelDelta<TestUser>[]>(resolve => {
                setTimeout(() => {
                    resolve([...deltas])
                }, 50)
            })
        });

        const [users] = createDeltaStore(() => memo());

        await new Promise<void>((resolve) => setTimeout(() => {
            resolve()
        }, 60))
        expect(users[0].username).toBe("newUsername");

        deltas.push({
            id: "some-id",
            timestamp: 200,
            path: "username",
            value: "newerUsername"
        });

        refresh(memo)

        await new Promise<void>((resolve) => setTimeout(() => {
            resolve()
        }, 60))

        expect(users[0].username).toBe("newerUsername");
    });
});

describe('DeltaStore writing', () => {
    it('should update the models when a provided memo is updated', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "username",
                value: "newUsername"
            }
        ];

        const [users, setUsers] = createDeltaStore(() => deltas);

        setUsers((store) => {
            store["some-id"].username = "updatedUsername"
        })
        flush()
        expect(users[0].username).toBe("updatedUsername");
    })

    it('should add a new model when a new ID is provided', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        setUsers((store) => {
            store["new-id"] = {
                username: "newUser",
            }
        })
        flush()

        expect(users[0].username).toBe("newUser");
    });

    it('should not be possible to update an id', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        setUsers((store) => {
            store["new-id"] = {
                id: "another-id",
                username: "newUser",
            } as any
        })
        flush()

        expect(users[0].id).toBe("new-id");
    });
})

describe("createMarker", () => {
    it('should return no deltas after being marked', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "username",
                value: "newUsername"
            }
        ];

        const store = createDeltaStore(() => deltas);

        const [getMarked, mark] = createMarker(store);

        mark()

        expect(getMarked()).toHaveLength(0);
    });

    it('should return only deltas added after being marked', () => {
        const deltas: ModelDelta<TestUser>[] = [
            {
                id: "some-id",
                timestamp: 100,
                path: "username",
                value: "newUsername"
            }
        ];

        const store = createDeltaStore(() => deltas);
        const [users, setUsers] = store

        const [getMarked, mark] = createMarker(store);

        mark();

        setUsers((store) => {
            store["some-id"].username = "updatedUsername"
        })

        flush()

        expect(getMarked()).toHaveLength(1);
    });
});
