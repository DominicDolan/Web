import {
    action,
    createAsync,
    json,
    query,
    RouteSectionProps,
    useAction,
    useParams,
    useSubmission
} from "@solidjs/router";
import {createEffect, createSignal, For, Show, Suspense} from "solid-js";
import {keyedDebounce} from "~/packages/utils/KeyedDebounce";
import {ModelDelta} from "~/data/ModelDelta";
import {ColorDefinition, colorDefinitionSchema} from "~/data/ColorDefinition";
import {deltaArrayToGroup, squashDeltasToSingle} from "~/packages/repository/DeltaReducer";
import {createDeltaModelContextStore, deltasSince} from "~/packages/deltaStoreUtils/DeltaModelContextStore";
import ColorItem from "~/app/themes/ColorEditor/ColorItem";
import {ColorAddButton} from "~/app/themes/ColorEditor/ColorAddButton";
import ExportCSSButton from "~/app/themes/ColorEditor/ExportCSSButton";
import {useDatabaseForModel} from "~/data/DBService";
import colorDefinitionSql from "~/schema/ColorDefinitionSql";
import {createModelStore} from "~/packages/repository/ModelStore";
import {calculateDelta} from "~/packages/repository/DeltaGenerator";
import {zodResponse} from "~/packages/utils/ZodResponse";

const colorQuery = query(async (themeId: string) => {
    "use server"
    const db = useDatabaseForModel(colorDefinitionSql)

    const definitions = await db.getManyByGroup(themeId)
    return deltaArrayToGroup(definitions)
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>, themeId: string) => {
    "use server"
    const modelId = delta.modelId
    const db = useDatabaseForModel(colorDefinitionSql)
    const existingDeltas: ModelDelta<ColorDefinition>[] = await db.getOne(modelId)
    const [_, push] = createModelStore({[modelId]: existingDeltas})

    const model = push(delta.modelId, delta.payload)

    const result = await colorDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])

        if (deltaToSave) {
            try {
                await db.insert(deltaToSave, themeId)
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

export const [ColorProvider, useColorContext] = createDeltaModelContextStore<ColorDefinition>()


export default function ColorEditor(props: RouteSectionProps<undefined>) {

    const colorDeltas = createAsync(async () => {
        const themeId = props.params.themeId
        if (themeId == null) return undefined
        return colorQuery(themeId);
    })

    const saveAction = useAction(updateColors)

    const colorsSubmission = useSubmission(updateColors)

    const [latestTimestamp, setLatestTimestamp] = createSignal(0)

    const save = keyedDebounce(async (_: string, deltas: ModelDelta<ColorDefinition>[]) => {
        const themeId = props.params.themeId
        if (themeId == null) return

        const mergedDeltas = squashDeltasToSingle(deltas)

        if (mergedDeltas == null) return

        colorsSubmission.clear()
        await saveAction(mergedDeltas, themeId)

        if (colorsSubmission.result?.success && colorsSubmission.result.updatedAt > latestTimestamp()) {
            setLatestTimestamp(colorsSubmission.result.updatedAt)
        }
    }, 300)

    function onColorDeltaPush(modelId: string, deltas: ModelDelta<ColorDefinition>[]) {
        save(modelId, deltas)
    }
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
            <ColorProvider deltas={colorDeltas()}
                           onDeltaPush={deltasSince(latestTimestamp(), onColorDeltaPush)}>
                {(colorModels) => <>
                    <hgroup flex={"row space-between"}>
                        <h3>Edit Colours</h3>
                        <ColorAddButton/>
                    </hgroup>
                    <div flex={"col gap-4"}>
                        <div>
                            <Show when={colorModels.length > 0} fallback={<div>No colors defined</div>}>
                                <For each={colorModels}>
                                    {(def) => {
                                        return <ColorItem definition={def}/>
                                    }}
                                </For>
                                <div flex={"row gap-4"}>
                                    <ExportCSSButton colorModels={colorModels}/>
                                </div>
                            </Show>
                        </div>
                    </div>
                </>}
            </ColorProvider>
        </Suspense>
    </article>
}
