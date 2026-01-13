import {ModelDelta} from "~/data/ModelDelta";
import {Model} from "~/data/Model";
import {createModelStore, ModelStoreFunctions, ModelStorePush} from "~/packages/repository/ModelStore";
import {UseContextStore} from "~/packages/deltaStoreUtils/ContextStore";
import {Show, splitProps} from "solid-js";

type InferModelFromProps<P> =
    P extends { deltas: Record<string, ModelDelta<infer MM>[]> } ? MM : never

export type DeltaAdapterParams<Props extends { deltas: Record<string, ModelDelta<M>[]>}, M extends Model = InferModelFromProps<Props>> = {
    models: M[],
    push: ModelStorePush<M>,
    props: Props,
    store: ModelStoreFunctions<M>
}

export function withDeltaAdapter<
    Props extends {deltas: Record<string, ModelDelta<M>[]>},
    Return,
    M extends Model = InferModelFromProps<Props>,
>(setup: (params: DeltaAdapterParams<Props, M>) => Return) {

    return (props: Props) => {
        const [models, push, store] = createModelStore<M>(props.deltas)

        return setup({
            models, push, props, store
        })
    }
}

export function UseStoreComponent<Store>(props: { is: () => Store, children: (store: Store) => any }) {
    const store = props.is()

    return <>{ props.children(store) }</>
}

export function DeltaContextProvider<
    Props extends {deltas: Record<string, ModelDelta<any>[]>},
    Store
>(props: {
    deltas: Props["deltas"] | undefined,
    useStore: UseContextStore<Props, Store>,
    children: (store: Store) => any
} & Omit<Props, "deltas" | "children">) {

    const [usedProps, otherProps] = splitProps(props, ["useStore", "children", "deltas"])

    return <Show when={usedProps.deltas != undefined}>
        <props.useStore.Provider
            {...(otherProps as unknown as Props)}
            deltas={usedProps.deltas as Record<string, ModelDelta<any>[]>}>
            <UseStoreComponent is={usedProps.useStore}>
                {store => usedProps.children(store)}
            </UseStoreComponent>
        </props.useStore.Provider>
    </Show>
}

