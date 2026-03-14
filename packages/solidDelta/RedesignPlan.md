# The idea behind using "deltas"

The DeltaMachine can convert a list of deltas (or changes or events) into a list of models which is passed to the UI.
The UI can the "push" a delta whenever it wants to update the model. This tends to be cleaner than directly mutating the model.

## Advantages:
1. **Mutations without mutation:** Appending a delta to a list acts like a mutation
2. **Consistency:** Having a timestamp allows consistency when different mutations occur at different times
3. **Undo:** The UI can easily undo the last delta
4. **Better DX:**Simply pushing a delta against a model ID is easier and simpler that finding the model and mutating it. Especially for nested data structures.

# Issues with current design

1. It consumes more storage. When editing an input it will create a new delta for every character. To keep consistency, all these deltas should be saved to the database.
2. We could try to "squash" the deltas to avoid point 1 but then we have a harder time dealing with 2 users editing the same value, this is an issue that using deltas is supposed to fix. 
3. The current implementation of DeltaMachine is probably more complex than it needs to be. It heavily relies on `createEvent()`. `DeltaMachine` and `DeltaStore` probably don't need to be 2 separate files.
4. This strategy of deltas is a departure from the design of Solid which means that we are often fighting the solid primitives.
5. It might be hard to get this implementation working with Solid 2.0 even though the Solid 2.0 features like `createProjection` could be very useful here.

# Future Design
Deltas should use Solid's path syntax (like `setStore`). Each delta represents a single path change with a timestamp. For each path, only the most recent delta matters—older ones can be deleted. This simplifies multi-user editing (latest change wins) and enables undo/redo by preserving and ordering deltas by timestamp.

## API Design

### Machine Creation
```typescript
// Option 1: Destructured
const { models: users, push, on } = createDeltaMachine<User>(userDeltas)

// Option 2: Object return
const machine = createDeltaMachine<User>(userDeltas)
// Access: machine.models, machine.push, machine.on
```

### Push Signatures
```typescript
// CREATE - generates id if not provided, creates single "create" delta
push("create", { username: "michael584", location: "Nigeria" })
// Delta: { type: "create", modelId: "auto-id", model: {...}, timestamp }

push("create", { id: "user-123", username: "michael584" })
// Delta: { type: "create", modelId: "user-123", model: {...}, timestamp }

// UPDATE - uses Solid path syntax, auto-splits into multiple deltas
push(userId, { username: "michael584", location: "Nigeria" })
// Creates 2 deltas with paths: ["username", "michael584"] and ["location", "Nigeria"]

push(userId, "profile", { name: "John", age: 30 })
// Creates 2 deltas: ["profile", "name", "John"] and ["profile", "age", 30]

push(userId, "profile", "name", "John")
// Creates 1 delta: ["profile", "name", "John"]

push(userId, "userProfiles", [0, 2], "enabled", true)
// Creates 2 deltas: ["userProfiles", 0, "enabled", true] and ["userProfiles", 2, "enabled", true]

// DELETE - uses path syntax, no value
push("delete", userId) // Delete entire model (path: [])
push("delete", userId, "username") // Delete field (path: ["username"])
push("delete", userId, "profile", "settings") // Delete nested (path: ["profile", "settings"])
```

## Usage Examples

### UI Level - Input onChange
```typescript
const { models: users, push } = createDeltaMachine<User>(userDeltas)

<input
  value={user.username}
  onInput={(e) => push(user.id, "username", e.target.value)}
/>

<input
  value={user.profile.name}
  onInput={(e) => push(user.id, "profile", "name", e.target.value)}
/>

// Batch update multiple fields
<button onClick={() => push(user.id, {
  username: "newname",
  lastActive: Date.now()
})}>
  Update
</button>
```

### Data Level - Saving Deltas
```typescript
const { models: users, push, on, mark, getUnmarkedDeltas } = createDeltaMachine<User>(userDeltas)

// Save individual deltas
on.pathChange((delta) => {
  // delta: { type: "update", modelId, path: [..., value], timestamp }
  //    or: { type: "create", modelId, model, timestamp }
  //    or: { type: "delete", modelId, path, timestamp }
  saveToDb(delta)
})

// Debounced batch save with marking
const debouncedSave = debounce(() => {
  const unsaved = getUnmarkedDeltas("saved")
  db.batchSaveDeltas(unsaved).then(() => {
    mark("saved") // Mark all deltas up to now as saved
  })
}, 500)

on.newDeltas(debouncedSave)

// Save with conflict resolution
on.pathChange((delta) => {
  if (delta.type === "update") {
    const pathWithoutValue = delta.path.slice(0, -1)
    const existing = db.getDelta(delta.modelId, pathWithoutValue)
    if (!existing || delta.timestamp > existing.timestamp) {
      db.saveDelta(delta) // Latest wins
    }
  } else {
    db.saveDelta(delta) // Create/delete always save
  }
})
```

### Complete Example
```typescript
const { models: users, push, on } = createDeltaMachine<User>(loadedDeltas)

// Create new user
const newUser = push("create", { username: "alice" })

// Update user
push(newUser.id, "profile", { name: "Alice", age: 25 })

// Delete field
push("delete", newUser.id, "profile", "age")

// Save to DB
on.newDeltas((deltas) => {
  deltas.forEach(d => db.save(d))
})
```

## Implementation Steps

1. **Refactor Delta Structure**
   - **Create delta**: `{ type: "create", modelId: string, model: Partial<M>, timestamp: number }`
   - **Update delta**: `{ type: "update", modelId: string, path: [...string[], value: any], timestamp: number }`
     - Path includes value as last element: `["profile", "name", "John"]` not `["profile", "name"]` + separate value
   - **Delete delta**: `{ type: "delete", modelId: string, path: string[], timestamp: number }`
     - Path excludes value (it's a deletion)

2. **Implement Push Signature**
   - `push("create", model)` - generate id if missing, create single "create" delta
   - `push(modelId, ...path, value)` - single update delta (e.g., `push(id, "profile", "name", "John")`)
   - `push(modelId, object)` - auto-split object into multiple update deltas
   - `push(modelId, ...pathWithArrays, value)` - expand array indices into multiple deltas
     - Example: `push(id, "userProfiles", [0, 2], "enabled", true)` → 2 deltas for `[0].enabled` and `[2].enabled`
   - `push("delete", modelId, ...path)` - delete delta for model or specific path
   - Helpers:
     - Expand objects into path arrays: `{username: "a", location: "b"}` → 2 update deltas
     - Expand Solid array syntax: `[0, 2]` in path → multiple deltas

3. **Simplify DeltaMachine Architecture**
   - Merge `DeltaMachine.ts` and `DeltaStore.ts` into single file
   - Avoid using `createEvent()` internally for complex event chains
   - Use `createEvent()` for external API: `on: { pathChange, newDeltas, modelCreate, modelDelete }`
   - Internal store: `Record<string, Record<pathString, Delta>>` for fast path lookup
   - Expose: `{ models: M[], push, on: { ... }, mark, deleteMarked, getUnmarkedDeltas }`

4. **Implement Path-Based Reducer**
   - Build models by applying deltas sorted by timestamp
   - Use `setStore` semantics: treat update path as `setStore(model, ...path.slice(0, -1), path[path.length - 1])`
   - For same path, latest timestamp wins (keep all deltas in memory for now)
   - Support Solid's array index syntax: `[0, 2]` expands to multiple paths

5. **Add Timestamp-Based Conflict Resolution**
   - When applying deltas, latest timestamp wins for same path
   - Keep all deltas in memory (no auto-squashing yet)
   - Marking system handles cleanup policy (see next step)

6. **Implement Delta Marking System**
   - `mark(label: string, timestamp?: number)` - mark deltas older than timestamp with label
     - Example: `mark("saved", Date.now())`, `mark("stale", oldTimestamp)`
   - `deleteMarked(label: string)` - delete all deltas with given label from memory
   - `getUnmarkedDeltas(label: string)` - get deltas without given label
     - Example: `getUnmarkedDeltas("saved")` returns unsaved deltas
   - Internal tracking: each delta has `marks: Set<string>`

7. **Optimize Storage & Persistence**
   - Debouncing should happen at consumer level (not in machine)
   - Use marking system for save tracking: `mark("saved")` after DB save
   - Use marking system for cleanup: `mark("stale")` then `deleteMarked("stale")`

8. **Solid 2.0 Compatibility**
   - Ensure stores work with fine-grained reactivity
   - Consider `createProjection` for model transformations
   - Test with Solid 2.0 primitives

## Tests Required

### Unit Tests
- **Push signature parsing**
  - `push("create", model)` with/without id
  - `push(id, ...path, value)` with various path lengths
  - `push(id, object)` splits into multiple deltas
  - `push("delete", id, ...path)`
- **Path expansion**
  - Object → path array conversion: `{a: 1, b: {c: 2}}` → `[["a"], ["b", "c"]]`
  - Nested object flattening
- **Delta application**
  - Apply path deltas using `setStore` semantics
  - Timestamp ordering (latest wins)
  - Auto-squashing older deltas for same path
- **Model reconstruction**
  - Build models from delta list
  - Handle create/update/delete deltas
  - Path-based updates on existing models

### Integration Tests
- **UI input changes**
  - Input onChange → `push(id, "field", value)` → model updates
  - Batch updates with object syntax
- **Persistence**
  - `getUnsavedDeltas()` tracks dirty deltas
  - `markSaved()` / `markAllSaved()` updates tracking
  - Load initial deltas → reconstruct models
- **Conflict resolution**
  - Multi-user: concurrent edits, latest timestamp wins
  - Same path updated multiple times: only latest kept
- **Memory/performance**
  - High-frequency input (1 delta per keystroke) with auto-squashing
  - Large object updates split correctly

### Edge Cases
- Delete field: `push("delete", id, "field")`
- Delete entire model: `push("delete", id)`
- Nested deletes: `push("delete", id, "profile", "settings")`
- Create with partial data
- Update/delete non-existent model should throw, 
- create -> delete -> update should throw
- Empty paths, null/undefined values
- Timestamp collisions (same millisecond)
