import {A, action, createAsync, json, query, useAction, useMatch, useNavigate, useSubmission,} from "@solidjs/router"
import NavBarTemplate from "~/app/common/NavBarTemplate";
import {useDatabaseTable} from "@theme-builder/d1/DatabaseTable";
import {deltaArrayToGroup, squashDeltasToSingle} from "@theme-builder/common/packages/repository/DeltaReducer";
import {For, onMount, Suspense} from "solid-js";
import AddThemeButton from "~/app/themes/ThemeEditor/AddThemeButton";
import {keyedDebounce} from "@theme-builder/common/packages/utils/KeyedDebounce";
import {ModelDelta} from "/ModelDelta";
import {createModelStore} from "@theme-builder/common/packages/repository/ModelStore";
import {calculateDelta} from "@theme-builder/common/packages/repository/DeltaGenerator";
import {createDeltaStoreTimestampMarker} from "@theme-builder/common/packages/deltaStoreUtils/DeltaStoreTimestampMarker";
import {createContextStore} from "@theme-builder/common/packages/deltaStoreUtils/ContextStore";
import {
    DeltaAdapterParams,
    DeltaContextProvider,
    withDeltaAdapter
} from "@theme-builder/common/packages/deltaStoreUtils/CotextStoreDeltaAdapter";
import {ThemeDefinition, themeDefinitionSchema} from "~/models/ThemeDefinition";

const getThemes = query(async () => {
    "use server"

    const db = useDatabaseTable(themeDefinitionSchema)

    const definitions = await db.getAll()

    return deltaArrayToGroup(definitions)

}, "getThemes")

const pushThemeDeltaAction = action(async (delta: ModelDelta<ThemeDefinition>) => {
    "use server"
    const modelId = delta.modelId
    const db = useDatabaseTable(themeDefinitionSchema)

    const existingDeltas = await db.getOne(modelId)
    const [_, push] = createModelStore({[modelId]: existingDeltas})

    const model = push(delta.modelId, delta.payload)

    const result = await themeDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])

        if (deltaToSave) {
            try {
                await db.insert(deltaToSave)
            } catch (e) {
                console.error("Error saving color delta:", e)
                return json({
                    success: false,
                    error: e,
                    updatedAt: existingDeltas.at(-1)?.timestamp ?? 0
                })
            }
        }
    }
})


export const [useThemeStore] = createContextStore(
    withDeltaAdapter((params: DeltaAdapterParams<{ deltas: Record<string, ModelDelta<ThemeDefinition>[]> }>) => {
        const deltaPushAction = useAction(pushThemeDeltaAction)
        const themeSubmission = useSubmission(pushThemeDeltaAction)

        const timestampMarker = createDeltaStoreTimestampMarker(params.store)
        timestampMarker.markAll()


        const save = keyedDebounce(async (id: string) => {
            const deltas = timestampMarker.getStreamFromMarked(id)

            const mergedDeltas = squashDeltasToSingle(deltas)

            if (mergedDeltas == null) return

            themeSubmission.clear()
            await deltaPushAction(mergedDeltas)

            if (themeSubmission.result?.success && themeSubmission.result.updatedAt > timestampMarker.getTimestampsById(id)) {
                timestampMarker.mark(id)
            }
        }, 4000)

        function flushSaveAction() {
            save.flush()
        }

        params.store.onAnyDeltaPush((deltas) => {
            save(deltas[0].modelId)
        })

        return {
            themes: params.models,
            pushThemeDelta: params.push,
            getThemeDeltasByModelId: (modelId: string) => params.store.getStreamById(modelId),
            flushSaveAction
        }
    })
)

export default function ThemeEditor(props: { children?: any }) {

    const themeDeltas = createAsync(() => getThemes(), {deferStream: true})

    const navigate = useNavigate()
    const matches = useMatch(() => "/editor/:themeId?/:subroute")
    onMount(() => {
        const deltas = themeDeltas()
        if (deltas != null && Object.keys(deltas).length > 0 && (matches() == undefined || matches()?.params.themeId == null)) {
            const themeId = Object.keys(deltas)[0]
            navigate(`/editor/${themeId}`, { replace: true })
        }
    })

    return <Suspense>
        <DeltaContextProvider deltas={themeDeltas()} useStore={useThemeStore}>
            {(store) => <div grid-cols={"[14rem,20rem,1fr]"} sizing={"w-full h-full"}>
                    <NavBarTemplate>
                        <div sizing={"w-full"} flex={"col gap-6"}>
                            <AddThemeButton/>
                            <ul class="nav" flex={"col gap-4"} sizing={"w-full"} spacing={"pl-0"}>
                                <For each={store.themes}>
                                    {(theme) => <li>
                                        <A href={`/editor/${theme.id}`} class={"display-block"}>{theme.name}</A>
                                    </li>}
                                </For>
                            </ul>
                        </div>
                    </NavBarTemplate>
                    {props.children}
                </div>
            }
        </DeltaContextProvider>
    </Suspense>
}
