import debounce, {DebouncedFunction, DebounceOptions} from "@theme-builder/common/packages/utils/Debounce"


export type KeyedDebouncedFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): void;
    cancel(): void;
    flush(): void;
    pending(): boolean;
};

export function keyedDebounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 0,
    options: DebounceOptions = {}
): KeyedDebouncedFunction<T> {

    const debounceMap = new Map<string, DebouncedFunction<T>>

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
