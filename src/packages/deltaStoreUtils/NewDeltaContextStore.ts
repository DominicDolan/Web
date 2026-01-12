import {createContextStore} from "~/packages/deltaStoreUtils/ContextStore";
import {ModelDelta} from "~/data/ModelDelta";
import {Model} from "~/data/Model";
import {createModelStore, ModelStore, ModelStoreFunctions, ModelStorePush} from "~/packages/repository/ModelStore";

type TestModel = Model & { name: string }
const [Provider, defineSomeStore] = createContextStore<{ deltas: Record<string, ModelDelta<TestModel>[]> }>()

type InferModelFromProps<P> =
    P extends { deltas: Record<string, ModelDelta<infer MM>[]> } ? MM : never

function withDeltaAdapter<
    Props extends {deltas: Record<string, ModelDelta<M>[]>},
    M extends Model = InferModelFromProps<Props>
>(setup: (params: { models: M[], push: ModelStorePush<M>, props: Props, store: ModelStoreFunctions<M> }) => any) {


    return (props: Props) => {
        const [models, push, store] = createModelStore<M>(props.deltas)

        return setup({
            models, push, props, store
        })
    }
}

defineSomeStore(withDeltaAdapter(({ models }) => {
    console.log(models[0].name)
    return {

    }

}))


const useSomeStore = defineSomeStore((props) => {

    console.log(props.deltas)

    return ({
    });
})
