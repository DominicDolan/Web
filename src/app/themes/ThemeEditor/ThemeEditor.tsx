import {
    A, action, createAsync, json, query, useAction, useMatch, useNavigate, useSubmission,
} from "@solidjs/router"
import NavBarTemplate from "~/app/common/NavBarTemplate";
import {useDatabaseForModel} from "~/data/DBService";
import themeDefinitionSql from "~/schema/ThemeDefinitionSql";
import {deltaArrayToGroup, squashDeltasToSingle} from "~/packages/repository/DeltaReducer";
import {
    defineContextStoreComponent,
} from "~/packages/deltaStoreUtils/DeltaModelContextStore";
import {ThemeDefinition, themeDefinitionSchema} from "~/data/ThemeDefinition";
import {createContext, For, onMount, Suspense} from "solid-js";
import AddThemeButton from "~/app/themes/ThemeEditor/AddThemeButton";
import {keyedDebounce} from "~/packages/utils/KeyedDebounce";
import {ModelDelta} from "~/data/ModelDelta";
import {createModelStore} from "~/packages/repository/ModelStore";
import {calculateDelta} from "~/packages/repository/DeltaGenerator";
import {createDeltaStoreTimestampMarker} from "~/packages/deltaStoreUtils/DeltaStoreTimestampMarker";

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


export const flushThemeContext = createContext({
    onReadyToSave: () => {
        console.warn("Called onReadyToSave outside of its provider. This is probably a bug.")
    }
})
const {Provider} = flushThemeContext

const [ThemeProvider, useThemeContext] = defineContextStoreComponent<ThemeDefinition>((themes, store, props) => {

    console.log("children ThemeProvider", props?.children)
    const deltaPushAction = useAction(pushThemeDeltaAction)
    const themeSubmission = useSubmission(pushThemeDeltaAction)

    console.log("Store in theme editor", store)
    const timestampMarker = createDeltaStoreTimestampMarker(store)
    timestampMarker.markAll()


    const save = keyedDebounce(async (id: string) => {
        const userId = tempUserId
        if (userId == null) return

        const deltas = timestampMarker.getStreamFromMarked(id)

        const mergedDeltas = squashDeltasToSingle(deltas)

        if (mergedDeltas == null) return

        themeSubmission.clear()
        await deltaPushAction(mergedDeltas, userId)

        if (themeSubmission.result?.success && themeSubmission.result.updatedAt > timestampMarker.getTimestampsById(id)) {
            timestampMarker.mark(id)
        }
    }, 4000)

    function flushSaveAction() {
        save.flush()
    }

    store.onAnyDeltaPush((deltas) => {
        save(deltas[0].modelId)
    })

    return <Provider value={{ onReadyToSave: flushSaveAction }}>
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
    </Provider>
})

export {useThemeContext}

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
        <ThemeProvider deltas={themeDeltas()}>{props.children}</ThemeProvider>
    </Suspense>
}
