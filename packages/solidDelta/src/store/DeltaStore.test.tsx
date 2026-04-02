import {ModelDelta} from "../model/ModelDelta";
import {Model} from "@web/schema";
import {createDeltaStore} from "./DeltaStore";
import {describe, it, expect} from "vitest";
import {createMemo, flush, refresh} from "solid-js";

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

    it('should add two new models when added in the same call', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        setUsers((store) => {
            store["id-1"] = { username: "user1" }
            store["id-2"] = { username: "user2" }
        })
        flush()

        expect(users.length).toBe(2);
    });

    it('should add two new models when added in separate calls', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        setUsers((store) => {
            store["id-1"] = { username: "user1" }
        })
        flush()
        setUsers((store) => {
            store["id-2"] = { username: "user2" }
        })
        flush()

        expect(users.length).toBe(2);
    });

    it('for an async factory function new models should be added after the factory completes', async () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => {
            return new Promise<ModelDelta<TestUser>[]>(resolve => {
                setTimeout(() => {
                    resolve([{
                        id: "id-1",
                        timestamp: 100,
                        path: "username",
                        value: "user1"
                    }])
                }, 50)
            })
        });

        await new Promise<void>((resolve) => setTimeout(resolve, 60))

        setUsers((store) => {
            store["id-2"] = { username: "user1" }
        })
        flush()

        await new Promise<void>((resolve) => setTimeout(resolve, 60))

        expect(users.length).toBe(2);
    });

    it('for an async factory function new models should be added when added while the factory completes', async () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => {
            return new Promise<ModelDelta<TestUser>[]>(resolve => {
                setTimeout(() => {
                    resolve([{
                        id: "id-1",
                        timestamp: 100,
                        path: "username",
                        value: "user1"
                    }])
                }, 50)
            })
        });

        await new Promise<void>((resolve) => setTimeout(resolve, 10))

        setUsers((store) => {
            store["id-2"] = { username: "user1" }
        })
        flush()

        await new Promise<void>((resolve) => setTimeout(resolve, 60))

        expect(users.length).toBe(2);
    });

    it('should add two new models when added in separate calls with a wait inbetween', async () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        await new Promise<void>((resolve) => setTimeout(resolve, 100))
        setUsers((store) => {
            store["id-1"] = { username: "user1" }
        })

        await new Promise<void>((resolve) => setTimeout(resolve, 100))
        setUsers((store) => {
            store["id-2"] = { username: "user2" }
        })
        await new Promise<void>((resolve) => setTimeout(resolve, 0))

        expect(users.length).toBe(2);
    });

    it('should add two new models and they should have correct IDs', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        setUsers((store) => {
            store["id-1"] = { username: "user1" }
            store["id-2"] = { username: "user2" }
        })
        flush()

        const ids = users.map(u => u.id);
        expect(ids).toContain("id-1");
        expect(ids).toContain("id-2");
    });

    it('should delete a record when it is removed from the draft', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => [
            { id: "id-1", timestamp: 100, path: "username", value: "user1" },
            { id: "id-2", timestamp: 100, path: "username", value: "user2" }
        ]);
        flush()

        expect(users.length).toBe(2);

        setUsers((store) => {
            delete store["id-1"]
        })
        flush()

        expect(users.length).toBe(1);
        expect(users[0].id).toBe("id-2");
    })

    it('should delete a nested property when it is removed from the draft', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => [
            { id: "id-1", timestamp: 100, path: "profile.name", value: "John" },
            { id: "id-1", timestamp: 100, path: "profile.settings.theme", value: "dark" }
        ]);
        flush()

        expect(users[0].profile?.settings?.theme).toBe("dark");

        setUsers((store) => {
            delete (store["id-1"].profile?.settings as any).theme
        })
        flush()

        expect(users[0].profile?.settings?.theme).toBeUndefined();
        expect(users[0].profile?.name).toBe("John");
    })

    it('should allow re-adding a record after it was deleted', () => {
        const [users, setUsers] = createDeltaStore<TestUser>(() => []);
        setUsers((store) => {
            store["id-1"] = { username: "user1" }
        })
        flush()
        expect(users.length).toBe(1);

        setUsers((store) => {
            delete store["id-1"]
        })
        flush()
        expect(users.length).toBe(0);

        setUsers((store) => {
            store["id-1"] = { username: "user1-new" }
        })
        flush()
        expect(users.length).toBe(1);
        expect(users[0].username).toBe("user1-new");
    })
})
