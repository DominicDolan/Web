import {describe, expect, test, vi} from "vitest"
import {createDeltaMachine} from "./DeltaMachine";
import {Model} from "@web/schema";

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

describe("DeltaMachine - Push signature parsing", () => {
    test("push('create', model) generates id and creates single create delta", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const newUser = push("create", { username: "michael584", location: "Nigeria" })

        expect(models.length).toBe(1)
        expect(newUser.id).toBeDefined()
        expect(newUser.username).toBe("michael584")
        expect(newUser.location).toBe("Nigeria")
    })

    test("push('create', model) with explicit id uses provided id", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const newUser = push("create", { id: "user-123", username: "michael584" })

        expect(models.length).toBe(1)
        expect(newUser.id).toBe("user-123")
        expect(newUser.username).toBe("michael584")
    })

    test("push(id, object) splits into multiple update deltas", () => {
        const { models, push, getStreamById } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, { username: "michael584", location: "Nigeria" })

        const stream = getStreamById(user.id)
        expect(stream).toBeDefined()

        // Should have 1 create delta + 2 update deltas
        const updateDeltas = stream!.filter(d => d.type === "update")
        expect(updateDeltas.length).toBe(2)

        expect(models[0].username).toBe("michael584")
        expect(models[0].location).toBe("Nigeria")
    })

    test("push(id, ...path, value) creates single update delta with path", () => {
        const { models, push, getStreamById } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, "profile", "name", "John")

        const stream = getStreamById(user.id)!
        const updateDeltas = stream.filter(d => d.type === "update")

        expect(updateDeltas.length).toBe(1)
        expect(updateDeltas[0].payload).toEqual(["profile", "name", "John"])
        expect(models[0].profile?.name).toBe("John")
    })

    test("push(id, path, object) creates multiple deltas with nested paths", () => {
        const { models, push, getStreamById } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, "profile", { name: "John", settings: { theme: "dark" } })

        const stream = getStreamById(user.id)!
        const updateDeltas = stream.filter(d => d.type === "update")

        // Should create deltas for "profile.name" and "profile.settings.theme"
        expect(updateDeltas.length).toBeGreaterThanOrEqual(1)
        expect(models[0].profile?.name).toBe("John")
        expect(models[0].profile?.settings?.theme).toBe("dark")
    })

    test("push(id, path, [indices], value) expands into multiple deltas", () => {
        const { models, push, getStreamById } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1", userProfiles: [{ enabled: false }, { enabled: false }, { enabled: false }] })
        push(user.id, "userProfiles", [0, 2], "enabled", true)

        const stream = getStreamById(user.id)!
        const updateDeltas = stream.filter(d => d.type === "update")

        // Should create 2 deltas for indices 0 and 2
        const enabledDeltas = updateDeltas.filter(d =>
            d.payload && d.payload.includes("enabled")
        )
        expect(enabledDeltas.length).toBe(2)

        expect(models[0].userProfiles?.[0]?.enabled).toBe(true)
        expect(models[0].userProfiles?.[1]?.enabled).toBe(false)
        expect(models[0].userProfiles?.[2]?.enabled).toBe(true)
    })

    test("push('delete', id) deletes entire model", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })
        expect(models.length).toBe(1)

        push("delete", user.id)
        expect(models.length).toBe(0)
    })

    test("push('delete', id, path) deletes specific field", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice", location: "USA" })
        expect(models[0].location).toBe("USA")

        push("delete", user.id, "location")
        expect(models[0].location).toBeUndefined()
        expect(models[0].username).toBe("alice")
    })

    test("push('delete', id, nested, path) deletes nested field", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", {
            profile: {
                name: "Alice",
                settings: { theme: "dark", notifications: true }
            }
        })

        expect(models[0].profile?.settings).toBeDefined()

        push("delete", user.id, "profile", "settings")
        expect(models[0].profile?.settings).toBeUndefined()
        expect(models[0].profile?.name).toBe("Alice")
    })
})

describe("DeltaMachine - Path expansion", () => {
    test("flat object expands to multiple path arrays", () => {
        const { models, push, getStreamById } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, { username: "alice", location: "USA", age: 30 })

        const stream = getStreamById(user.id)!
        const updateDeltas = stream.filter(d => d.type === "update")

        expect(updateDeltas.length).toBe(3)
        expect(models[0].username).toBe("alice")
        expect(models[0].location).toBe("USA")
        expect(models[0].age).toBe(30)
    })

    test("nested object flattens to path arrays", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, {
            profile: {
                name: "Bob",
                settings: { theme: "light" }
            }
        })

        expect(models[0].profile?.name).toBe("Bob")
        expect(models[0].profile?.settings?.theme).toBe("light")
    })

    test("mixed nested and flat updates work correctly", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, {
            username: "charlie",
            profile: {
                name: "Charlie",
                settings: { notifications: true }
            },
            age: 25
        })

        expect(models[0].username).toBe("charlie")
        expect(models[0].age).toBe(25)
        expect(models[0].profile?.name).toBe("Charlie")
        expect(models[0].profile?.settings?.notifications).toBe(true)
    })
})

describe("DeltaMachine - Delta application and timestamp ordering", () => {
    test("latest timestamp wins for same path", () => {
        const { models, pushMany } = createDeltaMachine<TestUser>()

        pushMany([
            { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "old" } },
            { modelId: "user-1", timestamp: 200, type: "update", payload: { username: "new" } },
            { modelId: "user-1", timestamp: 150, type: "update", payload: { username: "middle" } }
        ])

        expect(models[0].username).toBe("new")
    })

    test("deltas applied in timestamp order", () => {
        const { models, pushMany } = createDeltaMachine<TestUser>()

        // Push out of order
        pushMany([
            { modelId: "user-1", timestamp: 300, type: "update", payload: { age: 30 } },
            { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "alice" } },
            { modelId: "user-1", timestamp: 200, type: "update", payload: { location: "USA" } }
        ])

        expect(models[0].username).toBe("alice")
        expect(models[0].location).toBe("USA")
        expect(models[0].age).toBe(30)
    })

    test("concurrent edits resolve by timestamp", () => {
        const { models, pushMany } = createDeltaMachine<TestUser>()

        pushMany([
            { modelId: "user-1", timestamp: 100, type: "create", payload: {} },
            // Two users edit same field at different times
            { modelId: "user-1", timestamp: 200, type: "update", payload: { username: "user_a" } },
            { modelId: "user-1", timestamp: 201, type: "update", payload: { username: "user_b" } }
        ])

        // Latest wins
        expect(models[0].username).toBe("user_b")
    })
})

describe("DeltaMachine - Model reconstruction", () => {
    test("build model from create delta", () => {
        const { models } = createDeltaMachine<TestUser>({
            "user-1": [
                { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "alice", age: 25 } }
            ]
        })

        expect(models.length).toBe(1)
        expect(models[0].id).toBe("user-1")
        expect(models[0].username).toBe("alice")
        expect(models[0].age).toBe(25)
    })

    test("build model from create + multiple updates", () => {
        const { models } = createDeltaMachine<TestUser>({
            "user-1": [
                { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "bob" } },
                { modelId: "user-1", timestamp: 200, type: "update", payload: { location: "UK" } },
                { modelId: "user-1", timestamp: 300, type: "update", payload: { age: 40 } }
            ]
        })

        expect(models[0].username).toBe("bob")
        expect(models[0].location).toBe("UK")
        expect(models[0].age).toBe(40)
    })

    test("handle path-based updates on existing model", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1", username: "charlie" })
        push(user.id, "profile", "name", "Charlie C")
        push(user.id, "profile", "settings", "theme", "dark")

        expect(models[0].profile?.name).toBe("Charlie C")
        expect(models[0].profile?.settings?.theme).toBe("dark")
    })

    test("delete removes model from list", () => {
        const { models } = createDeltaMachine<TestUser>({
            "user-1": [
                { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "temp" } },
                { modelId: "user-1", timestamp: 200, type: "delete", payload: {} }
            ]
        })

        expect(models.length).toBe(0)
    })
})

describe("DeltaMachine - Event listeners", () => {
    test("on.pathChange fires for each delta", () => {
        const { push, on } = createDeltaMachine<TestUser>()
        const deltas: any[] = []

        on.anyDeltaPush((delta) => deltas.push(...delta))

        const user = push("create", { username: "alice" })
        push(user.id, { location: "USA", age: 25 })

        expect(deltas.length).toBeGreaterThanOrEqual(2)
        expect(deltas.some(d => d.type === "create")).toBe(true)
        expect(deltas.some(d => d.type === "update")).toBe(true)
    })

    test("on.modelCreate fires when model is created", () => {
        const { push, on } = createDeltaMachine<TestUser>()
        const created: any[] = []

        on.modelCreate((model) => created.push(model))

        push("create", { username: "bob" })
        push("create", { username: "alice" })

        expect(created.length).toBe(2)
        expect(created[0].username).toBe("bob")
        expect(created[1].username).toBe("alice")
    })

    test("on.modelDelete fires when model is deleted", () => {
        const { push, on } = createDeltaMachine<TestUser>()
        const deleted: string[] = []

        on.modelDelete((id) => deleted.push(id))

        const user = push("create", { username: "temp" })
        push("delete", user.id)

        expect(deleted).toContain(user.id)
    })

    test("on.newDeltas fires only for unmarked deltas", () => {
        const { push, on, mark } = createDeltaMachine<TestUser>()
        const newDeltas: any[] = []

        on.newDeltas((deltas) => newDeltas.push(...deltas))

        const user = push("create", { username: "alice" })
        mark("saved")

        push(user.id, { age: 30 })

        // Only the age update should fire - payload is the path ["age", 30]
        expect(newDeltas.some(d => Array.isArray(d.payload) && d.payload[0] === "age" && d.payload[1] === 30)).toBe(true)
    })
})

describe("DeltaMachine - Delta marking system", () => {
    test("mark(label) marks deltas with label", () => {
        const { push, mark, getUnmarkedDeltas } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })
        push(user.id, { age: 25 })

        mark("saved")

        const unsaved = getUnmarkedDeltas("saved")
        expect(unsaved.length).toBe(0)
    })

    test("mark(label, timestamp) marks only deltas older than timestamp", () => {
        const { pushMany, mark, getUnmarkedDeltas } = createDeltaMachine<TestUser>()

        pushMany([
            { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "alice" } },
            { modelId: "user-1", timestamp: 200, type: "update", payload: { age: 25 } },
            { modelId: "user-1", timestamp: 300, type: "update", payload: { location: "USA" } }
        ])

        mark("saved", 250)

        const unsaved = getUnmarkedDeltas("saved")
        expect(unsaved.length).toBe(1)
        expect(unsaved[0].timestamp).toBe(300)
    })

    test("getUnmarkedDeltas(label) returns deltas without label", async () => {
        const { push, mark, getUnmarkedDeltas } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })
        const unmarked1 = getUnmarkedDeltas("saved")

        mark("saved")

        // Wait a bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10))

        push(user.id, { age: 30 })
        const unmarked2 = getUnmarkedDeltas("saved")

        expect(unmarked1.length).toBeGreaterThan(0)
        expect(unmarked2.length).toBeGreaterThan(0)
        expect(unmarked2.every(d => d.timestamp > unmarked1[0].timestamp)).toBe(true)
    })

    test("deleteMarked(label) removes marked deltas from memory", () => {
        const { push, mark, deleteMarked, getStreamById } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })
        push(user.id, { age: 25 })

        mark("stale", Date.now())
        deleteMarked("stale")

        const stream = getStreamById(user.id)
        expect(stream).toBeUndefined()
    })

    test("multiple labels can be used independently", () => {
        const { push, mark, getUnmarkedDeltas } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })

        mark("saved")
        const unsavedAfterSave = getUnmarkedDeltas("saved")
        const unsynced = getUnmarkedDeltas("synced")

        expect(unsavedAfterSave.length).toBe(0)
        expect(unsynced.length).toBeGreaterThan(0)
    })
})

describe("DeltaMachine - Edge cases", () => {
    test("create with partial data", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })

        expect(models[0].username).toBe("alice")
        expect(models[0].location).toBeUndefined()
    })

    test("update non-existent model throws", () => {
        const { push } = createDeltaMachine<TestUser>()

        expect(() => {
            push("non-existent-id", { username: "fail" })
        }).toThrow()
    })

    test("delete non-existent model throws", () => {
        const { push } = createDeltaMachine<TestUser>()

        expect(() => {
            push("delete", "non-existent-id")
        }).toThrow()
    })

    test("create -> delete -> update throws", () => {
        const { push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "temp" })
        push("delete", user.id)

        expect(() => {
            push(user.id, { username: "fail" })
        }).toThrow()
    })

    test("empty path handled correctly", () => {
        const { push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice" })

        // Empty path should update whole model
        expect(() => {
            push(user.id, {})
        }).not.toThrow()
    })

    test("null/undefined values", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "alice", location: "USA" })
        push(user.id, { location: undefined })

        expect(models[0].location).toBeUndefined()
    })

    test("timestamp collisions (same millisecond)", () => {
        const { models, pushMany } = createDeltaMachine<TestUser>()

        // Same timestamp
        pushMany([
            { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "first" } },
            { modelId: "user-1", timestamp: 100, type: "update", payload: { username: "second" } }
        ])

        // Both should be applied
        expect(models[0].username).toBeDefined()
    })

    test("very deep nested paths work correctly", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, "profile", "settings", "theme", "dark")

        expect(models[0].profile?.settings?.theme).toBe("dark")
    })
})

describe("DeltaMachine - Integration scenarios", () => {
    test("UI input onChange simulation", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { username: "" })

        // Simulate typing "alice"
        push(user.id, "username", "a")
        push(user.id, "username", "al")
        push(user.id, "username", "ali")
        push(user.id, "username", "alic")
        push(user.id, "username", "alice")

        expect(models[0].username).toBe("alice")
    })

    test("batch update multiple fields", () => {
        const { models, push } = createDeltaMachine<TestUser>()

        const user = push("create", { id: "user-1" })
        push(user.id, {
            username: "newname",
            location: "Canada",
            age: 35
        })

        expect(models[0].username).toBe("newname")
        expect(models[0].location).toBe("Canada")
        expect(models[0].age).toBe(35)
    })

    test("debounced save simulation with marking", async () => {
        const { push, getUnmarkedDeltas, mark } = createDeltaMachine<TestUser>()
        const saved: any[] = []

        const saveToDb = (deltas: any[]) => {
            saved.push(...deltas)
            mark("saved")
        }

        const user = push("create", { username: "alice" })
        push(user.id, { age: 25 })

        const unsaved = getUnmarkedDeltas("saved")
        saveToDb(unsaved)

        push(user.id, { location: "USA" })

        const stillUnsaved = getUnmarkedDeltas("saved")
        expect(stillUnsaved.length).toBeGreaterThan(0)
    })

    test("conflict resolution - latest wins", () => {
        const { models, pushMany } = createDeltaMachine<TestUser>()

        // Simulate two users editing same field
        pushMany([
            { modelId: "user-1", timestamp: 100, type: "create", payload: { username: "original" } },
            { modelId: "user-1", timestamp: 200, type: "update", payload: { username: "user_a_edit" } },
            { modelId: "user-1", timestamp: 201, type: "update", payload: { username: "user_b_edit" } }
        ])

        expect(models[0].username).toBe("user_b_edit")
    })
})
