import {Context, createContext, useContext} from "solid-js";


type ScopeContextValue<Props> = {
    props: Props
    data: Map<symbol, unknown>
}

type ScopeProvider<Props> = (props: Props & {children?: any}) => any

type UseScope<Props, R> = (key: symbol, setup: (props: Props) => R) => R

export function createScopeProvider<Props extends Record<string, any>>(): ScopeProvider<Props> {
    const HMR_KEY = "createContextStore.storeContext";

    const storeContext = (((import.meta as any).hot?.data?.[HMR_KEY] as Context<ScopeContextValue<Props>> | undefined)
        ?? ((globalThis as any)[HMR_KEY] as Context<ScopeContextValue<Props>> | undefined)
        ?? createContext<ScopeContextValue<Props>>()) as Context<ScopeContextValue<Props>>

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


    function useScope<R>(key: symbol, setup: (props: Props) => R): R {
        const ctx = useContext(storeContext)
        if (ctx == null) {
            throw new Error(`Unable to retrieve props for context store with key: ${String(key)}`)
        }
        if (!ctx.data.has(key)) {
            ctx.data.set(key, setup(ctx.props))
        }
        return ctx.data.get(key) as R
    }

    ContextStoreProvider._useContextStore = useScope

    return ContextStoreProvider
}

export function defineScope<Props extends Record<string, any>, R>(provider: ScopeProvider<Props>, setup: (props: Props) => R) {
    const contextStoreKey = Symbol()

    if (!("_useContextStore" in provider)) {
        throw new Error("defineScope expects a provider created by createScopeProvider")
    }
    const useContextStore = provider._useContextStore as UseScope<Props, R>

    const useStore = () => {
        return useContextStore(contextStoreKey, setup)
    }

    useStore.Provider = provider

    return useStore
}
