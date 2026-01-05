import {
    A, action, createAsync, json, query, useAction, useMatch, useNavigate, useSubmission,
} from "@solidjs/router"
import NavBarTemplate from "~/app/common/NavBarTemplate";
import {useDatabaseForModel} from "~/data/DBService";
import themeDefinitionSql from "~/schema/ThemeDefinitionSql";
import {deltaArrayToGroup, squashDeltasToSingle} from "~/packages/repository/DeltaReducer";
import {createDeltaModelContextStore, deltasSince} from "~/packages/contextStore/DeltaModelContextStore";
import {ThemeDefinition, themeDefinitionSchema} from "~/data/ThemeDefinition";
import {createSignal, For, onMount, Suspense} from "solid-js";
import AddThemeButton from "~/app/themes/ThemeEditor/AddThemeButton";
import {keyedDebounce} from "~/packages/utils/KeyedDebounce";
import {ModelDelta} from "~/data/ModelDelta";
import {ColorDefinition} from "~/data/ColorDefinition";
import {createModelStore} from "~/packages/repository/ModelStore";
import {calculateDelta} from "~/packages/repository/DeltaGenerator";

const tempUserId = "0"

const getThemes = query(async () => {
    "use server"

    const db = useDatabaseForModel(themeDefinitionSql)

    const definitions = await db.getManyByGroup(tempUserId)

    return deltaArrayToGroup(definitions)

}, "getThemes")

const pushThemeDeltaAction = action(async (delta: ModelDelta<ThemeDefinition>, userId: string) => {
    "use server"
    const modelId = delta.modelId
    const db = useDatabaseForModel(themeDefinitionSql)

    const existingDeltas = await db.getOne(modelId)
    const [_, push] = createModelStore({[modelId]: existingDeltas})

    const model = push(delta.modelId, delta.payload)

    const result = await themeDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltaToSave = resultDelta == null ? delta : squashDeltasToSingle([delta, resultDelta])

        if (deltaToSave) {
            try {
                await db.insert(deltaToSave, userId)
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

export const [ThemeProvider, useThemeContext] = createDeltaModelContextStore<ThemeDefinition, { onReadyToSave: () => void}>()

export default function ThemeEditor(props: { children?: any}) {

    const themeDeltas = createAsync(() => getThemes(), { deferStream: true })

    const deltaPushAction = useAction(pushThemeDeltaAction)
    const themeSubmission = useSubmission(pushThemeDeltaAction)

    const [latestTimestamp, setLatestTimestamp] = createSignal(0)

    const navigate = useNavigate()
    const matches = useMatch(() => "/editor/:themeId?/:subroute")
    onMount(() => {
        const deltas = themeDeltas()
        if (deltas != null && Object.keys(deltas).length > 0 && (matches() == undefined || matches()?.params.themeId == null)) {
            const themeId = Object.keys(deltas)[0]
            navigate(`/editor/${themeId}`, { replace: true })
        }
    })

    const save = keyedDebounce(async (_: string, deltas: ModelDelta<ColorDefinition>[]) => {
        const userId = tempUserId
        if (userId == null) return

        const mergedDeltas = squashDeltasToSingle(deltas)

        if (mergedDeltas == null) return

        themeSubmission.clear()
        await deltaPushAction(mergedDeltas, userId)

        if (themeSubmission.result?.success && themeSubmission.result.updatedAt > latestTimestamp()) {
            setLatestTimestamp(themeSubmission.result.updatedAt)
        }
    }, 4000)

    function flushSaveAction() {
        save.flush()
    }

    function onThemeDeltaPush(modelId: string, deltas: ModelDelta<ThemeDefinition>[]) {
        save(modelId, deltas)
    }

    return <Suspense>
        <ThemeProvider
            deltas={themeDeltas()}
            onDeltaPush={deltasSince(latestTimestamp(), onThemeDeltaPush)}
            custom={{onReadyToSave: flushSaveAction}}>
            {(themes) => <>
                <div grid-cols={"[14rem,20rem,1fr]"} sizing={"w-full h-full"}>
                    <NavBarTemplate>
                        <div sizing={"w-full"} flex={"col gap-6"}>
                            <AddThemeButton/>
                            <ul class="nav" flex={"col gap-4"} sizing={"w-full"} spacing={"pl-0"}>
                                <For each={themes}>
                                    {(theme) => <li>
                                        <A href={`/editor/${theme.id}`} class={"display-block"}>{theme.name}</A>
                                    </li>}
                                </For>
                            </ul>
                        </div>
                    </NavBarTemplate>
                    {props.children}
                </div>
            </>}
        </ThemeProvider>
    </Suspense>
}
