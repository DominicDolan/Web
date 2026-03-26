import {A, action, createAsync, json, query, useAction, useMatch, useNavigate, useSubmission,} from "@solidjs/router"
import NavBarTemplate from "~/app/common/NavBarTemplate";
import {createEffect, For, on, Suspense} from "solid-js";
import AddThemeButton from "~/app/themes/ThemeEditor/AddThemeButton";
import {keyedDebounce, maxBy, zodResponse, minBy} from "@web/utils";
import {ThemeDefinition, themeDefinitionSchema} from "~/models/ThemeDefinition";
import {useDatabaseTable} from "@web/d1";
import {ModelDelta} from "@web/schema";
import {createScopeProvider} from "@web/solid-scope";

const getThemes = query(async () => {
    "use server"

    const db = useDatabaseTable(themeDefinitionSchema)

    const definitions = await db.getAll()

    return deltaArrayToGroup(definitions)

}, "getThemes")

const pushThemeDeltaAction = action(async (deltas: ModelDelta<ThemeDefinition>[]) => {
    "use server"
    if (deltas.length === 0) {
        return json({success: true, updatedAt: 0, error: new Error("No deltas provided")})
    }

    const modelId = deltas[0].modelId
    const db = useDatabaseTable(themeDefinitionSchema)

    const existingDeltas = await db.getOne(modelId)
    const {pushMany, getModelById} = createDeltaMachine({[modelId]: existingDeltas})

    pushMany(deltas)
    const model = getModelById(modelId)

    if (model == null) {
        return json({success: true, updatedAt: existingDeltas.at(-1)?.timestamp ?? 0})
    }

    const result = await themeDefinitionSchema.spa(model)

    if (result.success) {
        const resultDelta = calculateDelta(model, result.data)
        const deltasToSave = resultDelta == null ? deltas : deltas.concat(resultDelta)

        if (deltasToSave) {
            try {
                await db.insert(deltasToSave)
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

    return zodResponse(result)
})

export const ThemeProvider = createScopeProvider<{ deltas: Record<string, ModelDelta<ThemeDefinition>[]> | undefined }>()
export const useThemeScope = defineDeltaScope(ThemeProvider, (props) => {
    const deltaPushAction = useAction(pushThemeDeltaAction)
    const themeSubmission = useSubmission(pushThemeDeltaAction)

    props.markAllOld()

    const save = keyedDebounce(async (id: string) => {
        const deltas = props.getNewDeltasById(id)
        props.markOld(id, maxBy(deltas, (d) => d.timestamp)?.timestamp ?? 0)

        if (deltas.length === 0) return
        const oldestTimestamp = minBy(deltas, (d) => d.timestamp)?.timestamp ?? 0

        themeSubmission.clear()
        let result: Awaited<ReturnType<typeof deltaPushAction>> | null
        try {
            result = await deltaPushAction(deltas)
        } catch (e) {
            result = { success: false, updatedAt: 0, error: e as any } as typeof result
        }

        if (result != null && !result.success) {
            props.markOld(id, oldestTimestamp - 1)

            if ("error" in result && result.error.name !== "ZodError") {
                console.error("Error saving data:",deltas, result.error)
            }
        }
    }, 4000)

    function flushSaveAction() {
        save.flush()
    }

    props.on.newDeltaPush((deltas: ModelDelta<ThemeDefinition>[]) => {
        save(deltas[0].modelId)
    })

    return {
        themes: () => {
            return props.models
        },
        pushThemeDelta: props.push,
        getThemeDeltasByModelId: (modelId: string) => props.getStreamById(modelId),
        flushSaveAction
    }
})

export default function ThemeEditor(props: { children?: any }) {

    const themeDeltas = createAsync(() => getThemes(), {deferStream: true})

    const navigate = useNavigate()
    const matches = useMatch(() => "/editor/:themeId?/:subroute")

    createEffect(on(themeDeltas, (deltas, prevDeltas, prev) => {
        if (deltas != null && prevDeltas == null && Object.keys(deltas).length > 0 && (matches() == undefined || matches()?.params.themeId == null)) {
            const themeId = Object.keys(deltas)[0]
            navigate(`/editor/${themeId}`, { replace: true })
        }
    }))

    return <Suspense>
        <ThemeProvider deltas={themeDeltas()} use={useThemeScope}>{
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
    </Suspense>
}
