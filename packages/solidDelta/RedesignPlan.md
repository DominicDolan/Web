
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
the hood, array entries are stored through a self-describing reserved path
segment, `$array`, with a stable key per element and a fractional `order` field
for sorting. The user never sees the keys or the internal path segment.

- Default behaviour for **all** array fields, regardless of element type
  (primitives, objects, etc).
- Keys are auto-generated for elements without an `id` field. Elements with an
  `id` use that id as their key.
- Ordering uses **fractional indexing** so that inserts and reorders produce
  small, conflict-friendly deltas (no rewriting of neighbouring entries).
- Conversion (array ⇄ keyed object) happens entirely inside the delta layer
  (`createModels` + `useDeltaWriter`). Application code keeps using arrays.
- No schema metadata, Zod dependency, or schema helper is required to detect
  arrays. The delta path itself is self-describing, which keeps `createModels`
  and `useDeltaWriter` schema-free and primitive.

Array items have a three-phase lifecycle (create → update → delete), with
two reserved field names — `$order` and `$value` — that follow the same `$`
prefix convention as `$array`.

Array paths use this convention:

```ts
// create: primitive array item (reserved $order + $value)
{
  id: "task-1",
  path: "tags.$array.tag-a",
  value: {
    $order: 10,
    $value: "alpha",
  },
  timestamp: 20,
}

// create: object array item (reserved $order plus user fields)
{
  id: "task-1",
  path: "checklist.$array.item-b",
  value: {
    $order: 20,
    id: "item-b",
    label: "Second",
    done: false,
  },
  timestamp: 30,
}

// update: object array item field mutation (leaf primitive)
{
  id: "task-1",
  path: "checklist.$array.item-b.done",
  value: true,
  timestamp: 40,
}

// update: primitive array item value mutation (leaf primitive)
{
  id: "task-1",
  path: "tags.$array.tag-a.$value",
  value: "omega",
  timestamp: 45,
}

// delete: tombstone
{
  id: "task-1",
  path: "tags.$array.tag-a",
  value: undefined,
  timestamp: 50,
}

// update: reorder (leaf primitive on reserved $order)
{
  id: "task-1",
  path: "checklist.$array.item-b.$order",
  value: 15,
  timestamp: 60,
}
```

Projection rules:

- Any path containing the unescaped segment `$array` is treated as array
  storage.
- The segment immediately before `$array` is the user-facing array field name.
- The segment immediately after `$array` is the stable item key.
- Create deltas establish the item at `<arrayField>.$array.<itemKey>` with
  reserved fields `$order` (for sorting) and, for primitives, `$value` (for
  the inner value). Object items spread user fields alongside `$order`.
- Update deltas always address leaf paths ending in a primitive value, e.g.
  `<arrayField>.$array.<itemKey>.done` or
  `<arrayField>.$array.<itemKey>.$order` or
  `<arrayField>.$array.<itemKey>.$value`. No coarser-grained field deltas
  are written — this ensures that concurrent edits to different fields of the
  same array item never stomp each other.
- Primitive array entries are projected from their `$value` leaf.
- Object array entries are projected from their per-field leafs, without
  exposing internal storage keys or reserved fields (`$order`, `$value`).
- If the item object has an `id`, use that `id` as the stable item key when
  writing new deltas.
- If the item does not have an `id`, generate a stable key.
- Removing an item writes a tombstone delta at
  `<arrayField>.$array.<itemKey>` with `value: undefined`.
- Reordering should emit minimal order updates on the reserved `$order`
  field, e.g. `<arrayField>.$array.<itemKey>.$order`.

#### Path encoding / escaping

JavaScript object keys can be arbitrary strings, so there is no character that
is truly impossible as an object key. Therefore `$array` is a reserved
unescaped path segment, not an impossible user key.

Introduce a path codec responsible for encoding and decoding user-provided path
segments. The codec must escape:

- literal `.` characters, because `.` is the path separator;
- literal reserved segments such as `$array`;
- any escape prefix used by the codec itself.

Internal array paths use the unescaped `$array` segment. User object keys that
literally equal `$array` must be escaped so they are not confused with array
storage. Projection and writing logic must operate on decoded path segments but
preserve the distinction between reserved internal segments and escaped user
keys.

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

```ts
const writeDeltas = useDeltaWriter<Theme>(() => deltas)

writeDeltas(id, { name: "x" })                           // shallow patch
writeDeltas(id, draft => { draft.tags.push("new") })     // draft mutation
writeDeltas("create", { name: "New Theme" })            // create lifecycle delta, ID is created implicitly
writeDeltas("create", { id: "custom-id", name: "New Theme" })   // create delta with provided ID
writeDeltas("delete", id)                               // delete lifecycle delta
```


All knowledge of delta shape, the reserved `$array` path notation, array keying,
and path escaping lives in this module and the delta internals. Application
code continues to mutate normal JavaScript arrays. Callers must **never**
hand-construct deltas.

#### Layer 3 — `createDeltaStore` (convenience wrapper)

A thin wrapper that composes Layer 1 + Layer 2 with a built-in `createStore`,
preserving today's ergonomic `[models, setModels]` API. The 90% case.

```ts
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

```ts
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

```ts
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
under the hood. Array items have a three-phase lifecycle (create → update →
delete), with reserved `$order` and `$value` fields using the same `$`-prefix
convention as `$array`. Updates always target leaf primitives so that
concurrent edits to different fields of the same item never stomp each other.

1. **Path codec and reserved segment parsing**
    - **Tests** for path encoding/decoding:
        - Literal `.` characters in user keys round-trip safely.
        - Literal user keys equal to `$array`, `$order`, or `$value` are
          escaped and are not treated as reserved.
        - The codec escapes its own escape prefix.
        - Internal array paths retain unescaped `$array`, `$order`, and
          `$value` segments.
    - **Code**: implement a shared path codec and parser that distinguishes
      reserved internal segments (`$array`, `$order`, `$value`) from escaped
      user keys.
2. **Projection**
    - **Tests** in `createModels.test.ts`:
        - Paths such as `tags.$array.tag-a` project as arrays sorted by
          `$order`.
        - Primitive entries created as `{ $order, $value }` project as the
          inner `$value`.
        - Object entries created as `{ $order, ...item }` project as item
          objects without exposing reserved fields.
        - Inserting in the middle produces a single create delta.
        - Removing an item produces a single tombstone-style delete delta for
          that key.
        - Object item field mutations such as
          `checklist.$array.item-b.done` update that array item at leaf
          granularity.
        - Primitive item value mutation via `$value` leaf path updates the
          projected value.
    - **Code**: extend `createModels` to recognise the reserved `$array` path
      segment and convert array storage back into ordered arrays, using
      `$order` for sort and `$value` for primitive projection.
3. **Writes**
    - **Tests** in `useDeltaWriter.test.ts`:
        - Array `push` produces one create delta like `tags.$array.<itemKey>`
          with `{ $order, $value }` (for primitives) or `{ $order, ...fields }`
          (for objects), with fractional `$order` after the last existing item.
        - Array `splice` insert in the middle produces a create delta with
          `$order` between neighbours.
        - Array removal produces a delete delta like
          `tags.$array.tag-a` with `value: undefined`.
        - Array reorder via swap produces update deltas on
          `<arrayField>.$array.<itemKey>.$order` for only the moved items.
        - Mutating object fields of array items produces update deltas
          addressed by stable key, not index, e.g.
          `checklist.$array.item-b.done`.
        - Mutating a primitive array item's value produces an update delta on
          `tags.$array.<itemKey>.$value`.
    - **Code**: extend the draft mutation handler to diff array state in terms
      of `$array` keyed entries + fractional indices. Support array create
      (push/splice), delete (removal), update (reorder via `$order`, field
      mutation), and primitive value mutation via `$value`.
4. **Fractional ordering utility**
    - **Tests** for generating an order before, after, and between existing
      neighbouring order values.
    - **Code**: provide a fractional-indexing utility in
      `packages/solidDelta/src/utils`.
5. **Identity for objects with `id`**: prefer `id` as the stable item key when
   writing new object array deltas. Generate a stable key when no `id` exists.

   For objects with an `id`, the create delta value includes `$order` and
   spreads the user fields (including `id`) — but the path segment key is
   derived from the object's `id` field, not auto-generated.

   For objects without an `id`, generate a stable key and include all user
   fields alongside `$order` in the create delta.

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
- Schema-driven array detection is intentionally out of scope unless a future
  use case requires it.

---

## Migration Notes

- `ModelDelta<M>` becomes a discriminated union; downstream code that pattern-
  matches on `delta.path === ""` keeps working, but consumers reading
  `delta.value` for non-empty paths should expect the new typings.
- Hand-constructed deltas in application code (if any exist) must move to
  `useDeltaWriter`. A grep for `timestamp: Date.now()` across the repo will
  surface these.
- Any hand-constructed array deltas must be updated to the reserved `$array`
  path notation, e.g. `tags.$array.tag-a` instead of `tags.tag-a`.
- Callers should use `useDeltaWriter` instead of hand-writing array deltas,
  because the path codec and reserved segment escaping are internal details.
- The DB row format does not change. Lifecycle deltas use `path = ''` exactly
  as today, just with the value semantics formalised.
