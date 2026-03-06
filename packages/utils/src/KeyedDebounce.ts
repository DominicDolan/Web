import {debounce, DebouncedFunction, DebounceOptions} from "./Debounce"


export type KeyedDebouncedFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
    pending(): boolean;
};

/**
 * Creates a debounced function where each unique first argument gets its own debounce state.
 * Calls with different keys do not affect each other's wait window, pending status, or flush/cancel behavior.
 *
 * `flush()` immediately executes pending trailing invocations for every key and clears active timers.
 *
 * @template T - Function type. The first argument is treated as the debounce key.
 * @param func - The function to debounce per key.
 * @param wait - Debounce delay in milliseconds (default: 0).
 * @param options - Standard debounce options applied to each key bucket.
 * @returns A keyed debounced function with `cancel`, `flush`, and `pending`.
 */
export function keyedDebounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 0,
    options: DebounceOptions = {}
): KeyedDebouncedFunction<T> {

    const debounceMap = new Map<Parameters<T>[0], DebouncedFunction<T>>()

    function keyedDebounce(this: any, ...args: Parameters<T>) {
        if (args.length === 0) {
            throw new Error("No arguments provided as a key to debounce function")
        }
        const key = args[0]
        if (!debounceMap.has(key)) {
            debounceMap.set(key, debounce(func, wait, options))
        }

        debounceMap.get(key)?.(...args)

    }

    function cancel() {
        debounceMap.forEach((value) => {
            value.cancel()
        })
    }

    function flush() {
        debounceMap.forEach((value) => {
            value.flush()
        })
    }

    function pending() {
        let pending = false
        debounceMap.forEach((value) => {
            if (value.pending()) {
                pending = true
            }
        })

        return pending
    }

    keyedDebounce.cancel = cancel;
    keyedDebounce.flush = flush;
    keyedDebounce.pending = pending;

    return keyedDebounce
}
