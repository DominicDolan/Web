import {Context, createContext, useContext, Component, createSignal, createEffect} from "solid-js"

type ProviderComponent<Props> = Component<Props & { children?: any }>
export type UseContextStore<Props, R> = {
    (): R
    Provider: ProviderComponent<Props>
}
type DefineContextStore<Props> = <R>(setup: (props: Props) => R) => UseContextStore<Props, R>

export type CreateContextStoreMulti<Props extends Record<string, any>> = [
    DefineContextStore<Props>,
    Component<Props & {children?: any}>,
]

export type CreateContextStore<Props extends Record<string, any>, R> = [
    UseContextStore<Props, R>,
    Component<Props & {children?: any}>,
]

export function createContextStore<Props extends Record<string, any>, R = unknown>(setup: (props: Props) => R): CreateContextStore<Props, R> {
    const [defineStore, Provider] = createContextStoreMulti<Props>()

    return [
        defineStore(setup),
        Provider,
    ]
}

type ContextValue<Props> = {
    props: Props
    data: Map<symbol, unknown>
}

export function createContextStoreMulti<Props extends Record<string, any>>(): CreateContextStoreMulti<Props> {
    const HMR_KEY = "createContextStoreMulti.storeContext";

    const storeContext = (((import.meta as any).hot?.data?.[HMR_KEY] as Context<ContextValue<Props>> | undefined)
            ?? ((globalThis as any)[HMR_KEY] as Context<ContextValue<Props>> | undefined)
            ?? createContext<ContextValue<Props>>()) as Context<ContextValue<Props>>

    if ((import.meta as any).hot?.data) {
        (import.meta as any).hot.data[HMR_KEY] = storeContext;
    } else {
        (globalThis as any)[HMR_KEY] = storeContext;
    }

    function useContextStore<R>(key: symbol, setup: (props: Props) => R): R {
        const ctx = useContext(storeContext)
        if (ctx == null) {
            throw new Error(`Unable to retrieve props for context store with key: ${String(key)}`)
        }
        if (!ctx.data.has(key)) {
            ctx.data.set(key, setup(ctx.props))
        }
        return ctx.data.get(key) as R
    }

    const defineContextStore = function <R>(setup: (props: Props) => R) {
        const contextStoreKey = Symbol()

        const useStore = () => {
            return useContextStore(contextStoreKey, setup)
        }
        useStore.Provider = ContextStoreProvider

        return useStore
    }

    function ContextStoreProvider(props: Props & {children?: any}) {
        const data = new Map<symbol, unknown>()

        return <storeContext.Provider value={{props, data}}>
            {props.children}
        </storeContext.Provider>
    }

    useContextStore.Provider = ContextStoreProvider

    return [
        defineContextStore,
        ContextStoreProvider,
    ]
}
