import {createEffect} from "solid-js";
import {Model, ModelDelta} from "@web/schema";
import {createModelStore, ModelRecord, ModelStoreFunctions, ModelStorePush} from "../store/ModelStore";
import {defineScope, ScopeProvider} from "@web/solid-scope";


type InferModelFromProps<P> =
    P extends { deltas: ModelRecord<infer MM> | undefined } ? MM : never

export type DeltaScopeProps<Props extends { deltas: ModelRecord<M> | undefined}, M extends Model> = {
    models: M[],
    push: ModelStorePush<M>,
    props: Props,
    store: ModelStoreFunctions<M>
}

export function defineDeltaScope<Props extends {deltas: ModelRecord<M> | undefined}, R, M extends Model = InferModelFromProps<Props>>(
    provider: ScopeProvider<Props>,
    setup: (props: DeltaScopeProps<Props, M>) => R
) {
    return defineScope(provider, (props) => {
        const deltasDescriptor = Object.getOwnPropertyDescriptor(props, "deltas")
        const supportsLateHydration = typeof deltasDescriptor?.get === "function"
        if (props.deltas == null && !supportsLateHydration) {
            throw new Error("DeltaScope requires a deltas prop that cannot be null or undefined")
        }
        const modelStore = createModelStore<M>()
        const seenByModel = new Map<string, Set<string>>()

        function toDeltaKey(delta: ModelDelta<M>): string {
            const payloadEntries = Object.entries(delta.payload).toSorted(([a], [b]) => a.localeCompare(b))
            return `${delta.timestamp}|${delta.type}|${JSON.stringify(payloadEntries)}`
        }

        function hasSeen(delta: ModelDelta<M>): boolean {
            return seenByModel.get(delta.modelId)?.has(toDeltaKey(delta)) ?? false
        }

        function markSeen(delta: ModelDelta<M>) {
            const key = toDeltaKey(delta)
            let streamSet = seenByModel.get(delta.modelId)
            if (streamSet == null) {
                streamSet = new Set<string>()
                seenByModel.set(delta.modelId, streamSet)
            }
            streamSet.add(key)
        }

        modelStore[2].onAnyDeltaPush((incoming) => {
            for (const delta of incoming) {
                markSeen(delta)
            }
        })

        createEffect(() => {
            const incoming = props.deltas
            if (incoming == null) {
                return
            }

            const next: ModelDelta<M>[] = []

            for (const modelId in incoming) {
                const stream = incoming[modelId]
                for (const delta of stream) {
                    if (hasSeen(delta)) {
                        continue
                    }
                    markSeen(delta)
                    next.push(delta)
                }
            }

            if (next.length > 0) {
                modelStore[2].pushMany(next)
            }
        })

        return setup({
            models: modelStore[0],
            push: modelStore[1],
            props,
            store: modelStore[2]
        })
    })
}
