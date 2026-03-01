import {Context, createContext, useContext} from "solid-js";


type ContextValue<Props> = {
    props: Props
    data: Map<symbol, unknown>
}

type ContextStoreProvider<Props> = (props: Props & {children?: any}) => any

type UseContextStore<Props, R> = (key: symbol, setup: (props: Props) => R) => R

export function createContextStoreProvider<Props extends Record<string, any>>(): ContextStoreProvider<Props> {
    const HMR_KEY = "createContextStore.storeContext";

    const storeContext = (((import.meta as any).hot?.data?.[HMR_KEY] as Context<ContextValue<Props>> | undefined)
        ?? ((globalThis as any)[HMR_KEY] as Context<ContextValue<Props>> | undefined)
        ?? createContext<ContextValue<Props>>()) as Context<ContextValue<Props>>

    if ((import.meta as any).hot?.data) {
        (import.meta as any).hot.data[HMR_KEY] = storeContext;
    } else {
        (globalThis as any)[HMR_KEY] = storeContext;
    }

    function ContextStoreProvider(props: Props & {children?: any}) {
        const data = new Map<symbol, unknown>()

        return <storeContext.Provider value={{props, data}}>
            {props.children}
        </storeContext.Provider>
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

    ContextStoreProvider._useContextStore = useContextStore

    return ContextStoreProvider
}

function defineContextStore<Props extends Record<string, any>, R>(provider: ContextStoreProvider<Props>, setup: (props: Props) => R) {
    const contextStoreKey = Symbol()

    if (!("_useContextStore" in provider)) {
        throw new Error("defineContextStore expects a provider created by createContextStoreProvider")
    }
    const useContextStore = provider._useContextStore as UseContextStore<Props, R>

    const useStore = () => {
        return useContextStore(contextStoreKey, setup)
    }

    useStore.Provider = provider

    return useStore
}
