# Solid Delta System

The `solidDelta` package provides a robust system for managing state as a series of deltas. This approach enables effortless optimistic updates, conflict-friendly concurrent editing, and a clear audit trail of changes.

## Core Concepts

Instead of storing the current state of a model, the system stores a list of **Deltas**. The current state (the "Model") is a **projection** of these deltas.

### What is a Delta?

A `ModelDelta` is a record of a specific change to a model:
- `id`: The unique identifier of the model being modified.
- `path`: A dot-notation string indicating which field is changing (e.g., `"owner.name"`). An empty path `""` signifies a lifecycle event (Create/Delete).
- `value`: The new value for that field. For a Delete event, this is `undefined`. For a Create event, this is an object containing initial data.
- `timestamp`: A numeric value used to determine the order of operations (Last-Write-Wins).

## Architecture

The system is split into three composable layers:

### 1. Pure Projection: `createModels`
`createModels` is a read-only primitive. It takes an accessor to a list of deltas and projects them into a reactive collection of models.

**Projection Rules:**
- **Visibility**: A model is visible if there is at least one `Create` delta and no later `Delete` delta.
- **Last-Write-Wins**: For every property, the value from the delta with the highest timestamp wins.
- **No Floor on Create**: Field deltas with timestamps *earlier* than the most recent `Create` delta are still applied. This prevents data loss during offline delete/recreate cycles.
- **`updatedAt`**: The model's `updatedAt` property is the maximum timestamp among all its applied deltas.

### 2. Write Helper: `useDeltaWriter`
`useDeltaWriter` provides the API for generating new deltas from mutations. It handles the complexities of path encoding and array management.

**Capabilities:**
- **Shallow Patches**: Pass a partial object to generate field deltas.
- **Draft Mutations**: Pass a function to mutate a "draft" of the model. The writer diffs the draft against the current projected state to emit minimal field deltas.
- **Lifecycle Events**: Explicit `.create(id, data)` and `.delete(id)` methods.
- **Monotonic Timestamps**: Ensures that deltas generated in a single call have strictly increasing timestamps.

### 3. Synchronization State: `createDeltaTracker`
`createDeltaTracker` tracks which deltas have been acknowledged (e.g., saved to a server).

- **Frontier**: It maintains a "timestamp frontier" per tracker key (usually `id + path`). Any delta at or before this frontier is considered "tracked".
- **Inverse**: `tracker.inverse()` returns the set of "untracked" (unsaved) deltas.
- **Compaction**: By default, the tracker returns only the *latest* delta for any given key. This means if a user types "Hello" (generating 5 deltas), only the final "Hello" delta is sent to the server, but marking it as acked resolves all 5.

---

## Special Handling: Keyed Arrays

Standard array indices are unstable (inserting at index 0 shifts all others). To solve this, `solidDelta` uses **Keyed Storage with Fractional Ordering**.

### How it works
Arrays are projected as normal JavaScript arrays in the UI, but stored as keyed objects under the reserved `$array` path segment.

- **Storage Path**: `arrayField.$array.itemKey`
- **Stable Keys**: 
    - If an item has an `id`, that `id` is used as the `itemKey`.
    - Otherwise, a unique key is auto-generated.
- **Ordering**: A reserved `$order` field uses **fractional indexing**. To insert an item between order `10` and `20`, the system assigns order `15`. This avoids rewriting other items.
- **Primitives**: For arrays of primitives (e.g., `string[]`), the value is stored in a reserved `$value` field.

### Example Array Delta
```ts
// Adding a tag "alpha" to a task
{
  id: "task-1",
  path: "tags.$array.tag-a",
  value: { $order: 10, $value: "alpha" },
  timestamp: 100
}

// Updating the value of that tag
{
  id: "task-1",
  path: "tags.$array.tag-a.$value",
  value: "omega",
  timestamp: 110
}
```

## Summary Table

| Goal | Tool | Responsibility |
| :--- | :--- | :--- |
| **Read State** | `createModels` | Project deltas $\to$ Models |
| **Change State** | `useDeltaWriter` | Mutations $\to$ Deltas |
| **Track Sync** | `createDeltaTracker` | Mark deltas as Acked/Unsaved |
| **Convenience** | `createDeltaStore` | Composes the three above |
