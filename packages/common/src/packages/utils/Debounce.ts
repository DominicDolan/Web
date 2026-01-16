
export type DebounceOptions = {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
};

export type DebouncedFunction<T extends (...args: any[]) => any> = {
    (...args: Parameters<T>): ReturnType<T> | undefined;
    cancel(): void;
    flush(): ReturnType<T> | undefined;
    pending(): boolean;
};
/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked. The debounced function
 * comes with a `cancel` method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func` should be invoked on
 * the leading and/or trailing edge of the `wait` timeout. The `func` is invoked with the last
 * arguments provided to the debounced function. Subsequent calls to the debounced function
 * return the result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked on the trailing
 * edge of the timeout only if the debounced function is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred until the next tick,
 * similar to `setTimeout` with a timeout of `0`.
 *
 * @template T - The type of the function to debounce
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay (default: 0)
 * @param options - The options object
 * @param options.leading - Specify invoking on the leading edge of the timeout (default: false)
 * @param options.trailing - Specify invoking on the trailing edge of the timeout (default: true)
 * @param options.maxWait - The maximum time `func` is allowed to be delayed before it's invoked
 * @returns Returns the new debounced function with `cancel`, `flush`, and `pending` methods
 *
 * @example
 * // Avoid costly calculations while the window size is in flux
 * const debouncedResize = debounce(calculateLayout, 150);
 * window.addEventListener('resize', debouncedResize);
 *
 * @example
 * // Invoke `sendMail` when clicked, debouncing subsequent calls
 * const debouncedSendMail = debounce(sendMail, 300, { leading: true, trailing: false });
 * button.addEventListener('click', debouncedSendMail);
 *
 * @example
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls
 * const debounced = debounce(batchLog, 250, { maxWait: 1000 });
 * const source = new EventSource('/stream');
 * source.addEventListener('message', debounced);
 *
 * @example
 * // Cancel the trailing debounced invocation
 * window.addEventListener('popstate', debounced.cancel);
 *
 * @example
 * // Check for pending invocations
 * const status = debounced.pending() ? 'Pending...' : 'Ready';
 *
 * @since 1.0.0
 */
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number = 0,
    options: DebounceOptions = {}
): DebouncedFunction<T> {
    const { leading = false, trailing = true, maxWait } = options;

    let lastCallTime: number | undefined;
    let lastInvokeTime = 0;
    let timerId: NodeJS.Timeout | number | undefined;
    let lastArgs: Parameters<T> | undefined;
    let lastThis: any;
    let result: ReturnType<T> | undefined;

    function invokeFunc(time: number): ReturnType<T> {
        const args = lastArgs!;
        const thisArg = lastThis;

        lastArgs = undefined;
        lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result as ReturnType<T>;
    }

    function startTimer(pendingFunc: () => void, wait: number): NodeJS.Timeout | number {
        return setTimeout(pendingFunc, wait);
    }

    function cancelTimer(id: NodeJS.Timeout | number | undefined): void {
        if (id !== undefined) {
            clearTimeout(id as any);
        }
    }

    function leadingEdge(time: number): ReturnType<T> | undefined {
        lastInvokeTime = time;
        timerId = startTimer(timerExpired, wait);
        return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time: number): number {
        const timeSinceLastCall = time - (lastCallTime || 0);
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;

        return maxWait !== undefined
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }

    function shouldInvoke(time: number): boolean {
        const timeSinceLastCall = time - (lastCallTime || 0);
        const timeSinceLastInvoke = time - lastInvokeTime;

        return (
            lastCallTime === undefined ||
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 ||
            (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
        );
    }

    function timerExpired(): ReturnType<T> | undefined {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        timerId = startTimer(timerExpired, remainingWait(time));
        return result;
    }

    function trailingEdge(time: number): ReturnType<T> | undefined {
        timerId = undefined;

        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = undefined;
        lastThis = undefined;
        return result;
    }

    function cancel(): void {
        if (timerId !== undefined) {
            cancelTimer(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = undefined;
        lastCallTime = undefined;
        lastThis = undefined;
        timerId = undefined;
    }

    function flush(): ReturnType<T> | undefined {
        return timerId === undefined ? result : trailingEdge(Date.now());
    }

    function pending(): boolean {
        return timerId !== undefined;
    }

    function debounced(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastThis = this;
        lastCallTime = time;

        if (isInvoking) {
            if (timerId === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait !== undefined) {
                timerId = startTimer(timerExpired, wait);
                return invokeFunc(lastCallTime);
            }
        }
        if (timerId === undefined) {
            timerId = startTimer(timerExpired, wait);
        }
        return result;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    debounced.pending = pending;

    return debounced;
}

export default debounce;