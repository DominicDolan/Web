
### Delta synchronization state — `createDeltaTracker`

`createDeltaTracker` replaces the old timestamp-only `DeltaMarker` with a
small, composable primitive for tracking acknowledgement state over a single
append-only delta list.

The intended mental model is:

> There is one readonly, append-only list of deltas. A tracker stores a per-key
> timestamp frontier over that list. Deltas at or before the frontier are tracked;
> deltas after the frontier are untracked.

For save/acknowledgement use cases, the tracked set is usually "acked":
```ts
const acked = createDeltaTracker(() => deltas)

const unsaved = createMemo(() => acked.inverse())

const saveChanges = action(async () => {
  const batch = unsaved()

  if (batch.length === 0) return

  await saveDeltas(batch)

  acked.mark(batch)
})
```
This gives application code a small API:
```ts
const acked = createDeltaTracker(() => deltas)

acked.get()
acked.inverse()
acked.get({ suppressCompaction: true })
acked.inverse({ suppressCompaction: true })
acked.mark(batch)
acked.clear()
```
#### Terminology

- **Delta list**: the single append-only list of readonly deltas.
- **Tracker key**: the logical thing being tracked. By default this is
  `delta.id + "." + delta.path`.
- **Frontier**: the latest marked timestamp for a tracker key.
- **Tracked / acked**: deltas whose timestamp is at or before the frontier for
  their tracker key.
- **Inverse / unacked / unsaved**: deltas whose timestamp is after the frontier
  for their tracker key.
- **Compaction**: returning only the latest relevant delta per tracker key.

#### Default keying

By default, deltas are tracked by model id and path:
```ts
const key = `${delta.id}.${delta.path}`
```
This means repeated writes to the same field are treated as updates to the same
logical target.

Example:
```ts
[
{ id: "theme-1", path: "name", value: "N", timestamp: 1 },
{ id: "theme-1", path: "name", value: "Ne", timestamp: 2 },
{ id: "theme-1", path: "name", value: "New", timestamp: 3 }
]
```
If timestamp `3` is marked for `theme-1.name`, then timestamps `1`, `2`, and `3`
are all considered tracked for that key.

This is what allows compacted saves to implicitly resolve older superseded
deltas.

#### API shape

Illustrative type shape:
```ts
type DeltaTrackerReadOptions = {
suppressCompaction?: boolean
}

type DeltaTrackerOptions<M extends Model> = {
trackBy?: (delta: ModelDelta<M>) => string
}

type DeltaTracker<M extends Model> = {
get(options?: DeltaTrackerReadOptions): ModelDelta<M>[]
inverse(options?: DeltaTrackerReadOptions): ModelDelta<M>[]

mark(delta: ModelDelta<M> | readonly ModelDelta<M>[]): void
clear(): void
}
```
Potential later additions:
```ts
type DeltaTracker<M extends Model> = {
getFrontier(): ReadonlyMap<string, number>
setFrontier(key: string, timestamp: number): void
}
```
`unmark(delta)` is intentionally not part of the initial API. Since the tracker
stores timestamp frontiers, unmarking an individual delta is ambiguous. If the
frontier for `theme-1.name` is `10`, unmarking `theme-1.name@8` does not clearly
tell the tracker whether the frontier should become `7`, `9`, or something else.
Use `clear()` or explicit frontier APIs if this is ever needed.

#### `mark`

`mark(batch)` updates the timestamp frontier for each tracker key in the batch.

For each delta:
```ts
const key = trackBy(delta)
frontier[key] = Math.max(frontier[key] ?? -Infinity, delta.timestamp)
```
`mark` is monotonic by default. Calling `mark` with an older delta should not move
a frontier backwards.

Example:
```ts
acked.mark([
{ id: "theme-1", path: "name", value: "New", timestamp: 3 },
{ id: "theme-1", path: "description", value: "Hello", timestamp: 7 }
])
```
stores:
```ts
{
"theme-1.name": 3,
"theme-1.description": 7
}
```
#### `get`

`get()` returns tracked deltas.

By default, results are compacted:
```ts
acked.get()
```
For each tracker key, this returns only the latest delta whose timestamp is at or
before that key's frontier.

Example deltas:
```ts
[
{ id: "theme-1", path: "name", value: "N", timestamp: 1 },
{ id: "theme-1", path: "name", value: "Ne", timestamp: 2 },
{ id: "theme-1", path: "name", value: "New", timestamp: 3 }
]
```
Frontier:
```ts
{
"theme-1.name": 2
}
```
Then:
```ts
acked.get()
```
returns:
```ts
[
{ id: "theme-1", path: "name", value: "Ne", timestamp: 2 }
]
```
Raw tracked deltas can be requested with:
```ts
acked.get({ suppressCompaction: true })
```
which returns:
```ts
[
{ id: "theme-1", path: "name", value: "N", timestamp: 1 },
{ id: "theme-1", path: "name", value: "Ne", timestamp: 2 }
]
```
#### `inverse`

`inverse()` returns untracked deltas.

For acknowledgement use cases, this is the set of unsaved/unacked deltas.

By default, results are compacted:
```ts
acked.inverse()
```
For each tracker key, this returns only the latest delta whose timestamp is after
that key's frontier.

Example deltas:
```ts
[
{ id: "theme-1", path: "name", value: "N", timestamp: 1 },
{ id: "theme-1", path: "name", value: "Ne", timestamp: 2 },
{ id: "theme-1", path: "name", value: "New", timestamp: 3 },
{ id: "theme-1", path: "description", value: "Hello", timestamp: 4 }
]
```
Frontier:
```ts
{
"theme-1.name": 2
}
```
Then:
```ts
acked.inverse()
```
returns:
```ts
[
{ id: "theme-1", path: "name", value: "New", timestamp: 3 },
{ id: "theme-1", path: "description", value: "Hello", timestamp: 4 }
]
```
`description` is included because it has no frontier yet, so its frontier is
treated as `-Infinity`.

Raw untracked deltas can be requested with:
```ts
acked.inverse({ suppressCompaction: true })
```
#### Compaction behavior

Compaction is the default. The option is named `suppressCompaction` to make that
clear:
```ts
acked.inverse()                              // compacted
acked.inverse({ suppressCompaction: true })  // raw
```
Default compaction keeps only the latest delta per tracker key.

For most field-assignment deltas, this means a user can type into a text input and
produce many local deltas, but saving only needs to send the latest value:
```ts
[
{ id: "theme-1", path: "name", value: "N", timestamp: 1 },
{ id: "theme-1", path: "name", value: "Ne", timestamp: 2 },
{ id: "theme-1", path: "name", value: "New", timestamp: 3 }
]
```
`acked.inverse()` returns only:
```ts
[
{ id: "theme-1", path: "name", value: "New", timestamp: 3 }
]
```
After this compacted delta is saved, calling:
```ts
acked.mark(batch)
```
sets the frontier for `theme-1.name` to `3`, which also resolves the older
`name@1` and `name@2` deltas.

This avoids needing a separate `markResolved` API.

#### Solid integration

`createDeltaTracker` should be a small Solid-friendly primitive. Derived states
should be represented with `createMemo`.

Example:
```ts
const acked = createDeltaTracker(() => deltas)

const unsaved = createMemo(() => acked.inverse())
const hasUnsavedChanges = createMemo(() => unsaved().length > 0)
```
Solid's `isPending` should be used for async/network pending state, not for delta
acknowledgement state.
```ts
const saveChanges = action(async () => {
const batch = unsaved()

if (batch.length === 0) return

await saveDeltas(batch)

acked.mark(batch)
})

const saving = () => isPending(() => saveChanges())
```
So the responsibilities are:

| Question | Primitive |
|---|---|
| Which deltas are unsaved? | `acked.inverse()` |
| Are there unsaved changes? | `createMemo(() => acked.inverse().length > 0)` |
| Is a save request in flight? | `isPending(() => saveChanges())` |
| What models should the UI show? | `createModels(() => deltas)` |

#### Optimistic delta usage

The tracker is intended to work with Solid 2.0 optimistic patterns.

Conceptually:
```ts
const [deltas, setOptimisticDeltas] = createOptimisticStore(
   () => api.getDeltas(),
   []
)

const acked = createDeltaTracker(() => deltas)
const models = createModels(() => deltas)

const writeDeltas = useDeltaWriter(() => deltas)

function renameTheme(id: string, name: string) {
  const newDeltas = writeDeltas(id, { name })

  setOptimisticDeltas(deltas => {
     deltas.push(...newDeltas)
  })
}

const unsaved = createMemo(() => acked.inverse())

const saveChanges = action(async () => {
  const batch = unsaved()

  if (batch.length === 0) return

  await api.saveDeltas(batch)

  acked.mark(batch)

  refresh(deltas)
})
```
Server-loaded deltas should be marked as acked. This can be done explicitly:
```ts
createEffect(() => {
  acked.mark(serverDeltas())
})
```
or by a future append/helper API that appends server deltas and marks them acked
at the same time.

#### Important timestamp assumption

`createDeltaTracker` relies on timestamps being meaningful per tracker key.

For best results, `useDeltaWriter` should generate monotonic timestamps, ideally
strictly increasing for local writes. A simple implementation can keep a local
last timestamp:
```ts
let lastTimestamp = 0

function nextTimestamp() {
  const now = Date.now()
  lastTimestamp = Math.max(lastTimestamp + 1, now)
  return lastTimestamp
}
```
This avoids same-key timestamp collisions caused by multiple writes in the same
millisecond.

Same-key, same-timestamp deltas are ambiguous for both tracking and
last-write-wins projection. If two deltas have the same `id`, `path`, and
`timestamp`, the tracker will treat them as belonging to the same frontier point.

#### Edge cases to test

##### Basic frontier behavior

- With no marked frontiers, `get()` returns `[]`.
- With no marked frontiers, `inverse()` returns the compacted latest delta for
  each tracker key.
- `mark(delta)` records the timestamp frontier for that delta's tracker key.
- `mark(batch)` records the maximum timestamp per tracker key.
- Calling `mark` with an older delta does not move a frontier backwards.

##### `get()`

- `get()` returns the latest delta at or before the frontier for each key.
- `get({ suppressCompaction: true })` returns all deltas at or before the
  frontier for each key.
- Deltas for keys with no frontier are not returned by `get()`.

##### `inverse()`

- `inverse()` returns the latest delta after the frontier for each key.
- `inverse({ suppressCompaction: true })` returns all deltas after the frontier
  for each key.
- Deltas for keys with no frontier are returned by `inverse()`.
- `inverse()` returns `[]` after marking the latest delta for every key.

##### Superseded local edits

- Multiple writes to the same field compact to only the latest write.
- Marking the compacted latest write resolves older writes to the same key.
- After marking the latest write, `inverse()` does not return older superseded
  writes.
- After marking the latest write, `inverse({ suppressCompaction: true })` also
  does not return older superseded writes, because they are at or before the
  frontier.

##### Editing while save is in flight

Scenario:
```ts
name@1 = "N"
name@2 = "Ne"
name@3 = "New"
```
`inverse()` returns `name@3`, which is sent to the server.

Before the server responds:
```ts
name@4 = "New!"
```
When the server acknowledges `name@3`, calling `mark(name@3)` should set the
frontier to `3`.

Expected:
```ts
acked.inverse()
```
returns:
```ts
name@4
```
The later edit must not be accidentally marked as acked.

##### Multiple keys

- Marking `theme-1.name@3` does not affect `theme-1.description`.
- Marking `theme-1.name@3` does not affect `theme-2.name`.
- `inverse()` returns one compacted unsaved delta per key when multiple keys have
  unacked changes.

##### Server-loaded deltas

- Server-loaded deltas can be marked as acked with `acked.mark(serverDeltas)`.
- After server deltas are marked acked, `inverse()` does not return them.
- Local deltas appended after server deltas are returned by `inverse()`.
- Late-arriving server deltas with timestamps at or before a marked frontier are
  treated as already acked for that key.
- Late-arriving server deltas with timestamps after the frontier appear in
  `inverse()` unless explicitly marked acked. Repository/loading code should mark
  server-origin deltas acked when they are appended.

##### Partial save success

- If only part of a save batch succeeds, only the acknowledged deltas should be
  passed to `mark`.
- Unmarked deltas should continue to appear in `inverse()`.
- Marking one key from a batch should not mark unrelated keys from the same batch.

##### Same timestamp behavior

- Same-key, same-timestamp deltas are treated as the same frontier point.
- Marking timestamp `T` for a key treats all deltas for that key with timestamp
  `<= T` as tracked.
- Tests should document this behavior even if `useDeltaWriter` later guarantees
  strictly increasing local timestamps.

##### Lifecycle deltas

- `path: ""` deltas are tracked under the model-level key, e.g. `theme-1.`.
- Marking a create/delete lifecycle delta should not automatically mark field
  deltas for the same model unless a later lifecycle-specific policy is added.
- Create/delete semantics remain projection concerns; the tracker only knows
  about keys and timestamp frontiers.

##### Custom `trackBy`

- A custom `trackBy` can group deltas differently.
- `get()`, `inverse()`, and `mark()` should all use the same custom key function.
- Custom `trackBy` can be used later for array-keyed paths or lifecycle-specific
  tracking.

##### Clear/reset

- `clear()` removes all frontiers.
- After `clear()`, `get()` returns `[]`.
- After `clear()`, `inverse()` returns compacted latest deltas for all keys.

#### Non-goals

`createDeltaTracker` is not responsible for:

- projecting deltas into models;
- generating deltas;
- assigning timestamps;
- resolving semantic edit conflicts;
- server-side pruning;
- deciding whether server-origin deltas should be appended.

Those responsibilities remain in `createModels`, `useDeltaWriter`, repositories,
and stale-data policies.

#### Limitations

This tracker works best for assignment-style deltas where a later delta for the
same key supersedes earlier deltas for that key.

It is less appropriate for non-superseding operations such as:

- increment/decrement operations;
- positional text operations;
- non-idempotent commands;
- array operations based on unstable numeric indices.

The array redesign should preserve assignment-style semantics by storing arrays
as keyed objects with fractional ordering. This keeps tracker behavior compatible
with array edits because updates still target stable paths.
