
export type OnEventOptions = {
    once: boolean
}

export type EventCallbacks<P extends Array<unknown>, R> = {
    id: symbol
    callback: (...params: P) => R,
    options: OnEventOptions,
    clear: () => void
}

export type EventListener<P extends Array<unknown>, R = void> = [
    onEvent: (callback: EventCallbacks<P, R>["callback"], options?: Partial<OnEventOptions>) => () => void,
    triggerEvent: (...params: P) => void
]

export function createEvent<P extends Array<unknown>, R = void>(): EventListener<P, R> {
    const callbacks: Array<EventCallbacks<P, R>> = []

    function onEvent(callback: EventCallbacks<P, R>["callback"], options?: Partial<OnEventOptions>) {
        const id = Symbol()
        function clear() {
            const index = callbacks.findIndex(c => c.id === id)
            if (index !== -1){
                callbacks.splice(index, 1);
            }
        }

        callbacks.push({
            id,
            callback,
            options: eventOptionsWithDefaults(options),
            clear
        })

        return clear
    }

    function triggerEvent(...params: P) {
        for (const { callback, options, clear } of callbacks) {
            callback(...params)
            if (options.once) {
                clear();
            }
        }
    }

    return [
        onEvent,
        triggerEvent
    ]
}

export type KeyedEventListener<P extends Array<unknown>, R = void> = [
    onEvent: (key: string | symbol, callback: EventCallbacks<P, R>["callback"], options?: Partial<OnEventOptions>) => void,
    triggerEvent: (key: string | symbol, ...params: P) => void
]

export function createKeyedEvent<P extends Array<unknown>, R = void>(): KeyedEventListener<P, R> {
    const callbacks: Record<string | symbol, Array<EventCallbacks<P, R>>> = {}

    function onEvent(key: string | symbol, callback: EventCallbacks<P, R>["callback"], options?: Partial<OnEventOptions>) {
        if (callbacks[key] == undefined) {
            callbacks[key] = []
        }
        const id = Symbol()
        function clear() {
            const index = callbacks[key].findIndex(c => c.id === id)
            if (index !== -1){
                callbacks[key].splice(index, 1);
            }
        }

        callbacks[key].push({
            id,
            callback,
            options: eventOptionsWithDefaults(options),
            clear
        })

        return clear
    }

    function triggerEvent(key: string | symbol, ...params: P) {
        if (callbacks[key] == undefined) {
            return
        }

        for (const { callback, options, clear } of callbacks[key]) {
            callback(...params)
            if (options.once) {
                clear();
            }
        }
    }

    return [
        onEvent,
        triggerEvent
    ]
}

function eventOptionsWithDefaults(options?: Partial<OnEventOptions>) {
    const defaults: OnEventOptions = {
        once: false
    }

    return {
        ...defaults,
        ...options,
    }
}
