import {Context, createContext, useContext, Component, createSignal} from "solid-js"
import {createStore} from "solid-js/store"

type DefineContextStore<Props> = <R>(setup: (props: Props) => R) => () => R

export type CreateContextStore<Props extends Record<string, any>> = [
    Component<Props & {children?: any}>,
    DefineContextStore<Props>
]

export function createContextStore<Props extends Record<string, any>>(): CreateContextStore<Props> {
    const storeContext = createContext<Props>()
    const [data, setData] = createStore<Record<symbol, any>>({})

    function useContextStore<R>(key: symbol, setup: (props: Props) => R): R {
        const props = useContext(storeContext)
        if (props == null) {
            throw new Error(`Unable to retrieve props for context store with key: ${String(key)}`)
        }
        if (data[key] == null) {
            setData(key, setup(props))
        }
        return data[key] as R
    }

    const defineContextStore = function<R>(setup: (props: Props) => R): () => R {
        const contextStoreKey = Symbol()

        return () => {
            return useContextStore(contextStoreKey, setup)
        }
    }

    function ContextStoreProvider(props: Props & {children?: any}) {

        return <storeContext.Provider value={props}>
            {props.children}
        </storeContext.Provider>
    }

    return [
        ContextStoreProvider,
        defineContextStore,
    ]
}
