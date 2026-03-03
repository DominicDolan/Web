import {Context, createContext, onMount, useContext} from "solid-js";
import {createId} from "@paralleldrive/cuid2";

type ScopeContextValue<Props> = {
    props: Props
    data: Map<symbol, unknown>
}

export type ScopeProvider<Props> = <R, Scope extends { use?: UseScope<Props, R> }>(props: Props &
    Scope &
    { children?: Scope extends { use: UseScope<Props, infer R> } ? (props: R) => any : any }
) => any

type UseScopeInternal<Props, R> = (key: symbol, setup: (props: Props) => R) => R
type UseScope<Props, R> = {
    (): R
    Provider: ScopeProvider<Props>
}

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

    function ProviderChildren(props: { use?: UseScope<Props, any>} & {children?: any}) {
        const scope = props.use?.() ?? null
        return <>{scope == null ? props.children : props.children(scope)}</>
    }

    function ContextStoreProvider(props: Props & { use?: UseScope<Props, any>} & {children?: any}) {
        const data = new Map<symbol, unknown>()

        return <storeContext.Provider value={{props, data}}>
            <ProviderChildren use={props.use} children={props.children}/>
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

    ContextStoreProvider._useContextScope = useScope

    return ContextStoreProvider
}

export function defineScope<Props extends Record<string, any>, R>(provider: ScopeProvider<Props>, setup: (props: Props) => R) {
    const contextStoreKey = Symbol()

    if (!("_useContextScope" in provider)) {
        throw new Error("defineScope expects a provider created by createScopeProvider")
    }
    const useContextScope = provider._useContextScope as UseScopeInternal<Props, R>

    const useScope = () => {
        return useContextScope(contextStoreKey, setup)
    }

    useScope.Provider = provider

    return useScope
}
