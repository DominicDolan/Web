# Agent instructions

This repository uses Solid 2 beta. Be careful with APIs whose signatures changed from Solid 1.

## Collaborative agent workflow

Work in a collaborative mode with the user. Do the requested task, then summarize what changed and refer the user to run any checks they want locally.

Do **not** constantly run TypeScript error checks, builds, test suites, or other broad verification commands just to confirm everything is okay. Only run those checks when the user explicitly asks for them or when they are narrowly required for the specific task.

If a requirement is unclear, ambiguous, or has multiple reasonable interpretations, stop and ask the user for clarification instead of guessing what to do.

## Solid 2 `createEffect`

`createEffect` requires both a compute function and an effect function:

```ts
createEffect(() => signal(), (value) => {
    doWork(value);
});
```

Do **not** use the Solid 1 single-callback form:

```ts
// Incorrect in Solid 2
createEffect(() => {
    doWork(signal());
});
```

For multiple dependencies, return a tuple or object from the compute function:

```ts
createEffect(() => [first(), second()] as const, ([firstValue, secondValue]) => {
    doWork(firstValue, secondValue);
});
```

When an effect needs cleanup, return the cleanup function from the effect function:

```ts
createEffect(() => element(), (el) => {
    if (!el) {
        return;
    }

    const unsubscribe = subscribe(el);

    return () => {
        unsubscribe();
    };
});
```

Do **not** call `onCleanup` inside `createEffect`:

```ts
// Incorrect in Solid 2 effects
createEffect(() => element(), (el) => {
    if (!el) {
        return;
    }

    const unsubscribe = subscribe(el);
    onCleanup(() => unsubscribe());
});
```

If the code needs a derived value, use `createMemo`. If it needs a one-shot side effect, call the function directly instead of wrapping it in `createEffect`.

## Solid 2 Async

In solid 2 something like a `createMemo` can take an async function.

```ts
const data = createMemo(async () => {
    const response = await fetch("/api/data");
    return response.json();
});
```

When a memo like this is consumed, it needs to be wrapped in a `Loading` component to handle the pending state:

```tsx
<Loading fallback={<div>Loading...</div>}>
  <div>Data: {data()}</div>
</Loading>
```

It is also possible to use `isLoading` to check if any part of the reactive graph is pending:

```ts
// if data or snything data depends on is pending, this will be true
isLoading(() => data())
```



There is no need to use this pattern:

```ts
// Incorrect in Solid 2 async
const [data, setData] = createSignal(null);
const [loading, setLoading] = createSignal(true);

// `onSettled` replaces `onMount`
onSettled(() => {
    setLoading(true);
    fetch("/api/data")
        .then((response) => response.json())
        .then((json) => setData(json))
        .then(() => setLoading(false));
});
```



