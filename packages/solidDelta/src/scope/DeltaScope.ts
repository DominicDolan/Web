import {createEffect, on} from "solid-js";
import {Model, ModelDelta} from "@web/schema";
import {
    createDeltaMachine,
    ModelRecord,
    DeltaMachine
} from "../machine/DeltaMachine";
import {defineScope, ScopeProvider} from "@web/solid-scope";
import {maxBy} from "@web/utils";


type InferModelFromProps<P> =
    P extends { deltas: ModelRecord<infer MM> | undefined } ? MM : never

export type DeltaScopeProps<Props extends { deltas: ModelRecord<M> | undefined}, M extends Model> = { props: Props } & DeltaMachine<M>

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
        const deltaMachine = createDeltaMachine<M>()
        const seenByModel = new Map<string, Set<string>>()

        function toDeltaKey(delta: ModelDelta<M>): string {
            return `${delta.timestamp}|${delta.type}`
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

        deltaMachine.on.anyDeltaPush((incoming) => {
            for (const delta of incoming) {
                markSeen(delta)
            }
        })

        function markEachStreamOld(deltas: ModelRecord<M>) {
            for (const modelId in deltas) {
                const delta = maxBy(deltas[modelId], delta => delta.timestamp)
                if (delta != undefined) {
                    deltaMachine.markOld(delta.modelId, delta.timestamp)
                }
            }
        }

        let deltasWereNull = false
        if (props.deltas != null) {
            markEachStreamOld(props.deltas)
        } else {
            deltasWereNull = true
        }

        createEffect(() => {
            const incoming = props.deltas
            if (incoming == null) {
                deltasWereNull = true
                return
            }

            if (deltasWereNull) {
                deltasWereNull = false
                markEachStreamOld(incoming)
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
                deltaMachine.pushMany(next)
            }
        })

        return setup({
            props,
            ...deltaMachine
        })
    })
}
