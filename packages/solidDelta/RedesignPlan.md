
# Delta System Refactor Plan

## Background

The current `createDeltaStore` is a single abstraction that owns delta storage,
projects deltas into reactive models, and provides a draft-based setter. It
works, but three concerns have emerged:

1. **Arrays don't fit the path syntax.** Paths like `myObj.userList.4.firstName`
   break when items are inserted or deleted, because indices aren't stable
   identifiers under concurrent edits.
2. **The store is too opinionated.** It couples storage with projection, which
   makes it hard to use Solid 2.0 primitives like `createOptimisticStore` or
   custom `createProjection` setups alongside delta-based state.
3. **No explicit lifecycle events.** "Create" and "delete" are implicit, derived
   from the presence/absence of deltas. This makes garbage collection,
   validation of required fields, and conflict resolution harder than they
   need to be.

This plan addresses all three, and reshapes the package around composable
primitives.

---

## Design Decisions

### 1. Arrays — keyed representation with fractional ordering

Arrays in the user-facing model are presented as normal JavaScript arrays. Under
the hood, every array is stored as a keyed object with a stable key per element
and a fractional `order` field for sorting. The user never sees the keys.

- Default behaviour for **all** array fields, regardless of element type
  (primitives, objects, etc).
- Keys are auto-generated for elements without an `id` field. Elements with an
  `id` use that id as their key.
- Ordering uses **fractional indexing** so that inserts and reorders produce
  small, conflict-friendly deltas (no rewriting of neighbouring entries).
- Conversion (array ⇄ keyed object) happens entirely inside the delta layer
  (`createModels` + `useDeltaWriter`). Application code keeps using arrays.

### 2. Layered architecture

The package will be split into three composable layers.

#### Layer 1 — `createModels` (pure projection)

A pure data transform from a reactive deltas accessor to a reactive models
collection.

```ts
const models = createModels(() => deltas)
// or
const modelsById = createModelsById(() => deltas)
```


No write API, no storage assumptions. Consumers bring their own delta store
(`createStore`, `createOptimisticStore`, server resource, IndexedDB, etc).

#### Layer 2 — `useDeltaWriter` (write helper)

A small utility that produces deltas from mutations, with access to the current
deltas source so it can correctly resolve array keys, generate fractional
indices, and emit minimal deltas.

```textmate
const writeDeltas = useDeltaWriter<Theme>(() => deltas)

writeDeltas(id, { name: "x" })                           // shallow patch
writeDeltas(id, draft => { draft.tags.push("new") })     // draft mutation
writeDeltas("create", { name: "New Theme" })            // create lifecycle delta, ID is created implicitly
writeDeltas("create", { id: "custom-id", name: "New Theme" })   // create delta with provided ID
writeDeltas("delete", id)                               // delete lifecycle delta
```


All knowledge of delta shape, array keying, and path encoding lives in this
module. Callers must **never** hand-construct deltas.

#### Layer 3 — `createDeltaStore` (convenience wrapper)

A thin wrapper that composes Layer 1 + Layer 2 with a built-in `createStore`,
preserving today's ergonomic `[models, setModels]` API. The 90% case.

```textmate
const [themes, setThemes] = createDeltaStore<Theme>(() => fetchDeltas())
setThemes(draft => { draft[id].name = "x" })
```


Power users skip Layer 3 and compose Layers 1 + 2 with their own storage.

### 3. Explicit lifecycle deltas (create / delete)

Two new delta shapes, both using `path: ""`:

- **Create**: `{ id, path: "", value: <initial ModelData>, timestamp }`
    - `value` is an object containing initial field values.
    - Required fields enforced at the type level via `value: ModelData<M>`.
    - Initial values are semantically equivalent to field writes at the create's
      timestamp.
- **Delete**: `{ id, path: "", value: undefined, timestamp }`

Field deltas remain `{ id, path: "some.field", value, timestamp }`.

Type definition (illustrative):

```textmate
type CreateDelta<M extends Model> = {
  id: string
  path: ""
  value: ModelData<M>
  timestamp: number
}

type DeleteDelta = {
  id: string
  path: ""
  value: undefined
  timestamp: number
}

type FieldDelta<M extends Model> = {
  id: string
  path: KeySanitize<keyof ModelData<M>> | `${KeySanitize<keyof ModelData<M>>}.${string}`
  value: any
  timestamp: number
}

type ModelDelta<M extends Model> = CreateDelta<M> | DeleteDelta | FieldDelta<M>
```


### 4. Projection rules (used by `createModels`)

The client projection is intentionally simple and policy-free.

For each model id, sorting deltas by timestamp:

1. **Visibility**: a model is visible iff there exists at least one create
   delta with no later delete delta (a later create cancels a delete).
2. **Fields**: per-property last-write-wins across **all** field deltas
   (including the field writes embedded inside create's `value` object,
   treated as same-timestamp writes). There is **no floor** at the most recent
   create — field deltas from before the create still apply.
3. `updatedAt` is the maximum timestamp of any applied delta.

#### Why no floor on create?

- Handles offline delete/recreate toggling without losing concurrent edits from
  other users.
- Resists a class of "snipping" attacks/clock-skew issues where a create with a
  large timestamp could wipe out legitimate field deltas.
- A deliberate "fresh start" re-creation naturally clears previous state by
  carrying explicit initial values in the create's `value`, which then win at
  the create's timestamp.

### 5. Server-side stale data policy

Retention is a server-side concern, decoupled from the client projection. A
`StaleDataPolicy` interface determines which deltas can be pruned.

```textmate
type StaleDataPolicy = {
  shouldPrune(delta: ModelDelta, allDeltasForId: ModelDelta[], now: number): boolean
}
```


Planned policies (not all in scope for this refactor):

- **PermanentTombstone (default)**: once a model has a delete delta, prune all
  deltas for that id after a grace period.
- **UndoWindow**: keep deltas for N days after delete to permit undo, then prune.
- **ChangeHistoryAcked**: only prune once an external change-history table has
  acknowledged the deletion.

The client doesn't care which policy ran; it just projects whatever deltas it
receives.

---

## Implementation Plan (TDD)

We use TDD throughout: update or write the tests first, watch them fail, then
implement.

Work happens primarily in `packages/solidDelta`. Application code (e.g. theme
builder) is updated only at the end once the new API is stable.

### Phase 1 — Lifecycle deltas and projection rules

Goal: introduce create/delete lifecycle deltas and the new projection rules,
without yet splitting the API into separate layers.

1. **Tests**
    - Update `DeltaStore.test.tsx` to cover:
        - Create delta with initial values produces a visible model with those
          values.
        - Delete delta hides the model.
        - Create after delete restores the model.
        - Late-arriving field delta with timestamp before the most recent create
          still applies (no floor).
        - Field deltas with timestamps inside a deleted window do not appear
          (model not visible), but if a later create restores visibility, the
          per-property last-write-wins result includes them.
        - Required fields in create's `value` are type-enforced.
2. **Code**
    - Extend `ModelDelta<M>` type to the discriminated union of
      `CreateDelta | DeleteDelta | FieldDelta`.
    - Update projection logic to follow the new rules (visibility from
      lifecycle events; field last-write-wins ungated).
    - Keep `createDeltaStore` returning the same `[models, setModels]` tuple for
      now.

### Phase 2 — Extract `createModels`

Goal: extract pure projection into its own primitive.

1. **Tests**
    - New `createModels.test.ts` covering all projection rules in isolation
      (no store, just deltas in → models out).
2. **Code**
    - Implement `createModels(() => deltas)` and `createModelsById(() => deltas)`
      as standalone primitives.
    - Reimplement `createDeltaStore` to use `createModels` internally.

### Phase 3 — Extract `useDeltaWriter`

Goal: extract write logic into its own primitive.

1. **Tests**
    - New `useDeltaWriter.test.ts` covering:
        - Shallow patch object → field deltas.
        - Draft mutation → minimal field deltas (diff-based).
        - `create()` produces a create delta with required initial values.
        - `delete()` produces a delete delta.
        - Timestamps are monotonic within a single call.
2. **Code**
    - Implement `useDeltaWriter<M>(() => deltas)` with the API:
        - `writeDeltas(id, patchOrDraftFn)`
        - `writeDeltas.create(id, initialValue)`
        - `writeDeltas.delete(id)`
    - Reimplement `createDeltaStore`'s `setModels` to use `useDeltaWriter`
      internally.

### Phase 4 — Keyed arrays + fractional ordering

Goal: arrays in models are projected as real arrays but stored as keyed objects
under the hood.

1. **Schema additions** (`@web/schema`)
    - **Tests** for schema helpers (`array`, `atomicArray`).
    - **Code**: implement schema helpers and the metadata needed for
      `createModels` / `useDeltaWriter` to detect array fields.
2. **Projection**
    - **Tests** in `createModels.test.ts`:
        - Keyed-object deltas project as arrays sorted by `order`.
        - Inserting in the middle produces a single new keyed delta.
        - Removing an item produces a single tombstone-style delta for that key.
        - `atomicArray` fields project as the raw value (no key conversion).
    - **Code**: extend `createModels` to recognise array fields by schema and
      convert keyed-object storage back into ordered arrays.
3. **Writes**
    - **Tests** in `useDeltaWriter.test.ts`:
        - Array `push` produces one new keyed delta with fractional order after the
          last existing item.
        - Array `splice` (insert at middle) produces a single delta with a
          fractional order between neighbours.
        - Array reorder via swap produces minimal deltas (only the moved items).
        - Mutating object fields of array items produces deltas addressed by the
          stable key, not the index.
    - **Code**: extend the draft mutation handler to diff array state in terms
      of keyed entries + fractional indices. Provide a fractional-indexing utility
      in `packages/solidDelta/src/utils`.
4. **Identity for objects with `id`**: prefer `id` as the key when the schema
   indicates so.

### Phase 5 — Migrate consumers

Goal: switch app code over to the new API.

1. Update `ThemesListScope`, `ColorScope`, `TypefaceListScope`,
   `ElementStyleStore`, and any other scopes using `createDeltaStore`.
2. Where appropriate, switch to direct composition of `createModels` +
   `useDeltaWriter` (e.g. anywhere we want `createOptimisticStore`).
3. Replace hand-built lifecycle behaviour (current "create by setting fields"
   patterns) with explicit `writeDeltas.create(...)` and
   `writeDeltas.delete(...)`.

### Phase 6 — Server-side `StaleDataPolicy`

Goal: define the pruning interface and ship the default policy.

1. **Tests** for `PermanentTombstonePolicy.test.ts`:
    - All deltas for a deleted id are pruned after the grace period.
    - No deltas are pruned for live models.
    - Re-created ids are treated as live.
2. **Code**:
    - Define `StaleDataPolicy` interface.
    - Implement `PermanentTombstonePolicy` and wire it into the relevant
      repositories (e.g. `ColorRepository.server.ts`).
3. `UndoWindow` and `ChangeHistoryAcked` policies are deferred to follow-up
   work.

---

## Out of Scope

- `UndoWindow` and `ChangeHistoryAcked` policies (interface only for now).
- Server-authoritative timestamps / clock-skew correction. Mitigations are
  noted in design but not implemented here.
- A general `set(item)` schema helper. Add only if a real use case appears.

---

## Migration Notes

- `ModelDelta<M>` becomes a discriminated union; downstream code that pattern-
  matches on `delta.path === ""` keeps working, but consumers reading
  `delta.value` for non-empty paths should expect the new typings.
- Hand-constructed deltas in application code (if any exist) must move to
  `useDeltaWriter`. A grep for `timestamp: Date.now()` across the repo will
  surface these.
- The DB row format does not change. Lifecycle deltas use `path = ''` exactly
  as today, just with the value semantics formalised.

