import {Model} from "@web/schema";
import {createModelStore, ModelRecord, ModelStoreFunctions, ModelStorePush} from "../store/ModelStore";
import {defineScope, ScopeProvider} from "@web/solid-scope";


type InferModelFromProps<P> =
    P extends { deltas: ModelRecord<infer MM> } ? MM : never

export type DeltaScopeProps<Props extends { deltas: ModelRecord<M>}, M extends Model> = {
    models: M[],
    push: ModelStorePush<M>,
    props: Props,
    store: ModelStoreFunctions<M>
}

export function defineDeltaScope<Props extends {deltas: ModelRecord<M>}, R, M extends Model = InferModelFromProps<Props>>(
    provider: ScopeProvider<Props>,
    setup: (props: DeltaScopeProps<Props, M>) => R
) {
    return defineScope(provider, (props) => {
        if (props.deltas == null) {
            throw new Error("DeltaScope requires a deltas prop")
        }
        const modelStore = createModelStore(props.deltas)

        return setup({
            models: modelStore[0],
            push: modelStore[1],
            props,
            store: modelStore[2]
        })
    })
}
