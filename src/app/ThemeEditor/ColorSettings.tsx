import {action, createAsync, json, query, useAction, useSubmission} from "@solidjs/router";
import {createSignal, For, Suspense} from "solid-js";
import {keyedDebounce} from "~/packages/utils/KeyedDebounce";
import {ModelDelta} from "~/data/ModelDelta";
import {ColorDefinition, colorDefinitionSchema} from "~/data/ColorDefinition";
import {deltaArrayToGroup, squashDeltasToSingle} from "~/packages/repository/DeltaReducer";
import {createDeltaModelContextStore, deltasSince} from "~/packages/contextStore/DeltaModelContextStore";
import ColorItem from "~/app/ThemeEditor/ColorItem";
import {ColorAddButton} from "~/app/ThemeEditor/ColorAddButton";
import ExportCSSButton from "~/app/ThemeEditor/ExportCSSButton";
import {useDatabaseForModel} from "~/data/DBService";
import colorDefinitionSql from "~/schema/ColorDefinitionSql";
import {createModelStore} from "~/packages/repository/ModelStore";
import {calculateDelta} from "~/packages/repository/DeltaGenerator";
import {zodResponse} from "~/packages/utils/ZodResponse";


const colorQuery = query(async () => {
    "use server"
    const db = useDatabaseForModel(colorDefinitionSql)

    const definitions = await db.getManyByGroup("1")
    return deltaArrayToGroup(definitions)
}, "get-colors")

export const updateColors = action(async (delta: ModelDelta<ColorDefinition>) => {
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
                await db.insert(deltaToSave, "1")
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


export default function ColorSettings() {

    const colorDeltas = createAsync(() => colorQuery())

    const saveAction = useAction(updateColors)

    const colorsSubmission = useSubmission(updateColors)

    const [latestTimestamp, setLatestTimestamp] = createSignal(0)

    const save = keyedDebounce(async (_: string, deltas: ModelDelta<ColorDefinition>[]) => {
        const mergedDeltas = squashDeltasToSingle(deltas)

        if (mergedDeltas == null) return

        colorsSubmission.clear()
        await saveAction(mergedDeltas)

        if (colorsSubmission.result?.success && colorsSubmission.result.updatedAt > latestTimestamp()) {
            setLatestTimestamp(colorsSubmission.result.updatedAt)
        }
    }, 300)

    function onColorDeltaPush(modelId: string, deltas: ModelDelta<ColorDefinition>[]) {
        save(modelId, deltas)
    }
    return <div grid-area={"content"}>
        <div flex={"col gap-4"}>
            <Suspense
                fallback={<div
                    style={"min-height: 20rem; min-width: 20rem; background-color: red"}>Loading...</div>}>
                <ColorProvider deltas={colorDeltas()}
                               onDeltaPush={deltasSince(latestTimestamp(), onColorDeltaPush)}>
                    {(colorModels) => <div>
                        <For each={colorModels}>
                            {(def) => {
                                return <ColorItem definition={def}/>
                            }}
                        </For>
                        <div flex={"row gap-4"}>
                            <ColorAddButton/>
                            <ExportCSSButton colorModels={colorModels}/>
                        </div>
                    </div>}
                </ColorProvider>
            </Suspense>
            <div>
                Error: {JSON.stringify(colorsSubmission.result)}
            </div>
        </div>
    </div>
}
