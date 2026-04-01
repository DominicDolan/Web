import {Context, createContext, useContext, createMemo, omit} from "solid-js";

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

type ScopeProviderInternal<Props> = ScopeProvider<Props> & {
    _useContextScope: UseScopeInternal<Props, any>
}

export function createScopeProvider<Props extends Record<string, any>>(): ScopeProvider<Props> {
    const StoreContext = createContext<ScopeContextValue<Props>>()

    function ContextStoreProvider(props: Props & {children?: any}) {
        const data = new Map<symbol, unknown>()
        const propsNoChildren = omit(props, "children") as Props

        return <StoreContext value={{props: propsNoChildren, data}}>
            {props.children}
        </StoreContext>
    }

    function useScope<R>(key: symbol, setup: (props: Props) => R): R {
        const ctx = useContext(StoreContext)
        if (!ctx) {
             throw new Error(`Unable to retrieve props for context store with key: ${String(key)}. useScope must be called within a ScopeProvider.`)
        }

        if (!ctx.data.has(key)) {
            ctx.data.set(key, setup(ctx.props))
        }
        return ctx.data.get(key) as R
    }

    const provider = ContextStoreProvider as unknown as ScopeProviderInternal<Props>
    provider._useContextScope = useScope

    return provider
}

export function defineScope<Props extends Record<string, any>, R>(provider: ScopeProvider<Props>, setup: (props: Props) => R) {
    const contextStoreKey = Symbol()
    const internal = provider as unknown as ScopeProviderInternal<Props>

    if (!("_useContextScope" in internal)) {
        throw new Error("defineScope expects a provider created by createScopeProvider")
    }
    const useContextScope = internal._useContextScope as UseScopeInternal<Props, R>

    const useScope = () => {
        return useContextScope(contextStoreKey, setup)
    }

    useScope.Provider = provider

    return useScope
}
