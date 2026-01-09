import {Context, createContext, createEffect, on, Show, useContext} from "solid-js";
import {createModelStore, ModelStore} from "~/packages/repository/ModelStore";
import {ModelDelta} from "~/data/ModelDelta";
import {sliceArrayAfter} from "~/packages/repository/DeltaMerger";
import {Model} from "~/data/Model";
import {DeltaStore} from "~/packages/repository/DeltaStore";

export type ContextStoreProviderPropsBase<M extends Model> = {
    deltas: Record<string, ModelDelta<M>[]> | undefined
    children: (list: M[]) => any
    fallback?: any
    onDeltaPush?: (modelId: string, newDeltas: ModelDelta<M>[], store: ReturnType<typeof createModelStore<M>>[2]) => void
}
export type ContextStoreProviderProps<M extends Model, P extends Record<string, any> | undefined = undefined> = P extends undefined ?
    ContextStoreProviderPropsBase<M> : ContextStoreProviderPropsBase<M> & { custom: P }

export function deltasSince<M extends Model>(timestamp: number, callback: Required<ContextStoreProviderProps<M>>["onDeltaPush"]): ContextStoreProviderProps<M>["onDeltaPush"] {
    return (modelId: string, newDeltas: ModelDelta<M>[], store: ReturnType<typeof createModelStore<M>>[2]) => {
        const stream = store.getStreamById(modelId)

        if (stream == null) return () => {}

        const mergedDeltas = sliceArrayAfter(stream, timestamp)

        if (mergedDeltas == null) return () => {}

        callback(modelId, mergedDeltas, store)
    }
}

type StoreContext<M extends Model, P extends Record<string, any> | undefined> = {
    pushDelta: ModelStore<M>[1],
    getStreamById: DeltaStore<M>[1]["getStreamById"]
    customProps: P
}

export function createDeltaModelContextStore<M extends Model, P extends Record<string, any> | undefined = undefined>() {
    const HMR_KEY = "DeltaModelContextStore.storeContext";

    const storeContext =
        (((import.meta as any).hot?.data?.[HMR_KEY] as Context<StoreContext<M, P>> | undefined)
        ?? ((globalThis as any)[HMR_KEY] as Context<StoreContext<M, P>> | undefined)
        ?? createContext<StoreContext<M, P>>()) as Context<StoreContext<M, P>>

    if ((import.meta as any).hot?.data) {
        (import.meta as any).hot.data[HMR_KEY] = storeContext;
    } else {
        (globalThis as any)[HMR_KEY] = storeContext;
    }

    function useDeltaStore() {
        const context = useContext(storeContext)
        if (context == null) {
            throw new Error("Unable to retrieve context store, this function should only be called inside a ContextStoreProvider")
        }

        return [
            context.pushDelta,
            {
                getStreamById: context.getStreamById,
                custom: (("customProps" in context) ? context.customProps : undefined) as P
            }
        ] as const
    }

    function ContextStoreProvider(props: ContextStoreProviderProps<M, P>) {
        const [models, push, store] = createModelStore<M>(props.deltas)
        const {onAnyDeltaPush} = store

        onAnyDeltaPush((deltas) => {
            if (deltas.length === 0) {
                return
            }
            const modelId = deltas[0].modelId
            props.onDeltaPush?.(modelId, deltas, store)
        })

        if (props.deltas == undefined) {
            createEffect(on(() => props.deltas, (_, oldValue) => {
                if (oldValue != undefined) {
                    console.warn("DeltaModelContextStore: deltas won't update reactively except when changing from undefined")
                    return
                }
                for (const key in props.deltas) {

                    const deltas = props.deltas[key]
                    if (deltas != undefined) {
                        store.pushMany(deltas)

                    }
                }
            }))
        }

        return <Show when={props.deltas != undefined} fallback={props.fallback}>
            <storeContext.Provider value={{
                pushDelta: push,
                getStreamById: store.getStreamById,
                customProps: ("custom" in props) ? props.custom : undefined
            } as StoreContext<M, P>}>
                {props.children(models)}
            </storeContext.Provider>
        </Show>
    }

    return [
        ContextStoreProvider,
        useDeltaStore,
    ] as const
}
