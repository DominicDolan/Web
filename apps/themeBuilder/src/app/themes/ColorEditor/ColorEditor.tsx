import {
    action,
    createAsync,
    json,
    query, RoutePreloadFuncArgs,
    RouteSectionProps,
    useAction,
    useSubmission
} from "@solidjs/router";
import {For, Show, Suspense} from "solid-js";
import {keyedDebounce} from "@web/utils";
import ColorItem from "~/app/themes/ColorEditor/ColorItem";
import {ColorAddButton} from "~/app/themes/ColorEditor/ColorAddButton";
import ExportCSSButton from "~/app/themes/ColorEditor/ExportCSSButton";
import {zodResponse} from "@web/utils";
import {ColorDefinition, colorDefinitionSchema} from "~/models/ColorDefinition";
import {useDatabaseTable} from "@web/d1";
import {
    calculateDelta, createContextStore, createDeltaStoreTimestampMarker,
    createModelStore, DeltaAdapterParams,
    deltaArrayToGroup, DeltaContextProvider,
    ModelDelta,
    squashDeltasToSingle,
    withDeltaAdapter
} from "@web/delta";

const colorQuery = query(async (themeId: string) => {
    "use server"
    const db = useDatabaseTable(colorDefinitionSchema)

    const definitions = await db.getManyBy("theme", themeId)
    return deltaArrayToGroup(definitions)
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>, themeId: string) => {
    "use server"
    const modelId = delta.modelId
    const db = useDatabaseTable(colorDefinitionSchema)
    const existingDeltas: ModelDelta<ColorDefinition>[] = await db.getOne(modelId)
    const [_, push] = createModelStore({[modelId]: existingDeltas})

    const model = push(delta.modelId, delta.payload)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])

        if (deltaToSave) {
            try {
                await db.insert(deltaToSave, { "theme": themeId})
            } catch (e) {
                console.error("Error saving color delta:", e)
                return json({
                    success: false,
                    error: e,
                    updatedAt: existingDeltas.at(-1)?.timestamp ?? 0
                }, { revalidate: [] })
            }
        }
    }

    return zodResponse(result, { revalidate: [] })
})

export const [useColorStore] = createContextStore(withDeltaAdapter((params: DeltaAdapterParams<{ deltas: Record<string, ModelDelta<ColorDefinition>[]>, themeId?: string }>) => {
    const saveAction = useAction(updateColors)
    const colorsSubmission = useSubmission(updateColors)


    const timestampMarker = createDeltaStoreTimestampMarker(params.store)
    timestampMarker.markAll()

    const save = keyedDebounce(async (colorId: string) => {
        const themeId = params.props.themeId
        if (themeId == null) return

        const deltas = timestampMarker.getStreamFromMarked(colorId)
        const mergedDeltas = squashDeltasToSingle(deltas)

        if (mergedDeltas == null) return

        colorsSubmission.clear()
        await saveAction(mergedDeltas, themeId)

        if (colorsSubmission.result?.success && colorsSubmission.result.updatedAt > timestampMarker.getTimestampsById(colorId)) {
            timestampMarker.mark(colorId)
        }
    }, 300)


    params.store.onAnyDeltaPush((deltas) => {
        save(deltas[0].modelId)
    })

    return {
        colors: params.models,
        pushColorDelta: params.push,
    }
}))

export const preloadColors = (args: RoutePreloadFuncArgs) => {
    const themeId = args.params.themeId
    if (themeId == null) return

    colorQuery(themeId)

    return undefined
}

export default function ColorEditor(props: RouteSectionProps<undefined>) {

    const colorDeltas = createAsync(async () => {
        const themeId = props.params.themeId
        if (themeId == null) return undefined
        return colorQuery(themeId);
    })

    return <article sizing={"w-50rem"} spacing={"ma-auto"}>
        <Suspense
            fallback={
                <skeleton-loader>
                    <div sizing={"h-2rem"} class={"sizing-w-20rem"}></div>
                    <div grid={"cols-[15rem,20rem]"} spacing={"my-3"}>
                        <div flex={"col gap-4"}>
                            <div flex={"row gap-4"}>
                                <div sizing={"min-w-3rem min-h-3rem"}></div>
                                <div sizing={"h-1.5rem w-20rem"}></div>
                            </div>
                            <div sizing={"h-1rem w-20rem"}></div>
                        </div>
                    </div>
                </skeleton-loader>
            }>
            <DeltaContextProvider deltas={colorDeltas()} themeId={props.params.themeId} useStore={useColorStore}>
                {({colors}) => <>
                    <hgroup flex={"row space-between"}>
                        <h3>Edit Colours</h3>
                        <ColorAddButton/>
                    </hgroup>
                    <div flex={"col gap-4"}>
                        <div>
                            <Show when={colors.length > 0} fallback={<div>No colors defined</div>}>
                                <For each={colors}>
                                    {(def) => {
                                        return <ColorItem definition={def}/>
                                    }}
                                </For>
                                <div flex={"row gap-4"}>
                                    <ExportCSSButton colorModels={colors}/>
                                </div>
                            </Show>
                        </div>
                    </div>
                </>}
            </DeltaContextProvider>
        </Suspense>
    </article>
}
