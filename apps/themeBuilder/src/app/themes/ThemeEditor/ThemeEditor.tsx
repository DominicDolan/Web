import {A, action, createAsync, json, query, useAction, useMatch, useNavigate, useSubmission,} from "@solidjs/router"
import NavBarTemplate from "~/app/common/NavBarTemplate";
import {For, onMount, Show, Suspense} from "solid-js";
import AddThemeButton from "~/app/themes/ThemeEditor/AddThemeButton";
import {keyedDebounce} from "@web/utils";
import {ThemeDefinition, themeDefinitionSchema} from "~/models/ThemeDefinition";
import {
    calculateDelta,
    createDeltaStoreTimestampMarker,
    createModelStore,
    deltaArrayToGroup,
    squashDeltasToSingle,
    defineDeltaScope
} from "@web/solid-delta";
import {useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/schema";
import {createScopeProvider} from "@web/solid-scope";

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
                console.error("Error saving color solidDelta:", e)
                return json({
                    success: false,
                    error: e,
                    updatedAt: existingDeltas.at(-1)?.timestamp ?? 0
                })
            }
        }
    }
})

export const ThemeProvider = createScopeProvider<{ deltas: Record<string, ModelDelta<ThemeDefinition>[]> }>()
export const useThemeScope = defineDeltaScope(ThemeProvider, (props) => {
    const deltaPushAction = useAction(pushThemeDeltaAction)
    const themeSubmission = useSubmission(pushThemeDeltaAction)

    const timestampMarker = createDeltaStoreTimestampMarker(props.store)
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

    props.store.onAnyDeltaPush((deltas: ModelDelta<ThemeDefinition>[]) => {
        save(deltas[0].modelId)
    })

    return {
        themes: () => {
            return props.models
        },
        pushThemeDelta: props.push,
        getThemeDeltasByModelId: (modelId: string) => props.store.getStreamById(modelId),
        flushSaveAction
    }
})

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
        <Show when={themeDeltas()}>
            {(td) => <ThemeProvider deltas={td()} use={useThemeScope}>{
                    (scope) => <div grid-cols={"[14rem,20rem,1fr]"} sizing={"w-full h-full"}>
                        <NavBarTemplate class={"themeEditor"}>
                            <div sizing={"w-full"} flex={"col gap-6"}>
                                <AddThemeButton/>
                                <ul class="nav" flex={"col gap-4"} sizing={"w-full"} spacing={"pl-0"}>
                                    <For each={scope.themes()}>
                                        {(theme) => <li>
                                            <A href={`/editor/${theme.id}`} class={"display-block"}>{theme.name}</A>
                                        </li>}
                                    </For>
                                </ul>
                            </div>
                        </NavBarTemplate>
                        {props.children}
                    </div>
                }</ThemeProvider>
            }
        </Show>
    </Suspense>
}
