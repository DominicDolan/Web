import {Model} from "@web/schema";
import {createModelStore, ModelRecord, ModelStoreFunctions, ModelStorePush} from "../store/ModelStore";
import {defineScope, ScopeProvider} from "@web/solid-scope";

export type DeltaScopeProps<M extends Model, Props extends { deltas: ModelRecord<M>}> = {
    models: M[],
    push: ModelStorePush<M>,
    props: Props,
    store: ModelStoreFunctions<M>
}

export function defineDeltaScope<M extends Model, Props extends {deltas: ModelRecord<M>}, R>(
    provider: ScopeProvider<Props>,
    setup: (props: DeltaScopeProps<M, Props>) => R
) {
    return defineScope(provider, (props) => {
        const modelStore = createModelStore(props.deltas)

        return setup({
            models: modelStore[0],
            push: modelStore[1],
            props,
            store: modelStore[2]
        })
    })
}
