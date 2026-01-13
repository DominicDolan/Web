import {A, useNavigate} from "@solidjs/router";
import {createMemo, For, Show} from "solid-js";
import {useThemeStore} from "~/app/themes/ThemeEditor/ThemeEditor";
import {reduceDeltasToModel} from "~/packages/repository/DeltaReducer";
import Popover from "~/packages/utils/Popover";

export default function ThemeSettings(props: { children?: any, params: { themeId?: string }}) {

    const {pushThemeDelta, getThemeDeltasByModelId} = useThemeStore()

    const {flushSaveAction} = useThemeStore()

    const theme = createMemo(() => {
        if (props.params.themeId == null) return undefined
        const stream = getThemeDeltasByModelId(props.params.themeId);
        if (stream == null) return undefined

        return reduceDeltasToModel(stream)
    })

    function onNameChange(e: Event) {
        const t = theme()
        if (t == null) return
        pushThemeDelta(t.id, { name: (e.target as HTMLInputElement).value })
    }

    function onDescriptionChange(e: Event) {
        const t = theme()
        if (t == null) return
        pushThemeDelta(t.id, { description: (e.target as HTMLInputElement).value })
    }

    function onBlur() {
        flushSaveAction()
    }

    const navigate = useNavigate()
    function onDeleteClick(e: MouseEvent) {
        const t = theme()
        if (t == null) return

        // close the popover
        const popover = (e.currentTarget as HTMLElement).closest("[popover]") as any
        popover?.hidePopover?.()

        const ok = window.confirm(`Delete theme "${t.name}"?`)
        if (!ok) return

        pushThemeDelta("delete", t.id)
        flushSaveAction()
        navigate("/editor", { replace: true })
    }


    return <>
        <Show when={theme() != null} fallback={<skeleton-loader class={"themeSettings"} flex={"col gap-8"} spacing={"pa-8"}>
            <div sizing={"w-full h-0.75rem"}></div>
            <For each={Array.from({length: 3})}>
                {() => <div flex={"col gap-4"}>
                        <div sizing={"w-6rem h-1rem"}></div>
                        <div sizing={"w-full h-1.25rem"}></div>
                    </div>
                }
            </For>
        </skeleton-loader>}>

            <div
                class={"themeSettings"}
                spacing={"py-6 px-6"}
                flex={"col center"}>
                <section sizing={"w-full"} flex={"col gap-4"} spacing={"mb-8"}>
                    <hgroup flex={"row center space-between"}>
                        <h2>Theme Settings</h2>
                        <Popover
                            placement="bottom-end"
                            activator={(activatorProps) => (
                                <button
                                    class={"text"}
                                    {...activatorProps}
                                    flex={"row center"}
                                    spacing={"pa-2"}
                                    aria-label="Theme settings menu">
                                    <i>more_vert</i>
                                </button>)
                        }>
                            <ul class={"menu"}>
                                <li onClick={onDeleteClick} flex={"row gap-2 center"}><i>delete</i>Delete</li>
                            </ul>
                        </Popover>

                    </hgroup>
                    <form-field flex={"col gap-2"}>
                        <label>Name</label>
                        <input-shell>
                            <input type={"text"} value={theme()?.name ?? ""} onInput={onNameChange} onBlur={onBlur}
                                   required/>
                        </input-shell>
                    </form-field>
                    <form-field flex={"col gap-2"}>
                        <label>Description</label>
                        <textarea onInput={onDescriptionChange} onBlur={onBlur}>{theme()?.description ?? ""}</textarea>
                    </form-field>
                    <form-field flex={"col gap-2"}>
                        <label>Tags</label>
                        <select/>
                    </form-field>
                </section>
                <hr sizing={"w-full"}/>
                <section sizing={"w-full"} flex={"col gap-4"} spacing={"mt-10 mb-8"}>
                    <h2 spacing={"mb-2"}>Edit Theme</h2>
                    <ul class={"plain"} flex={"col"}>
                        <li flex={"row space-between"}>
                            <A href={"/editor"}>Edit Colors</A>
                            <i>keyboard_arrow_right</i>
                        </li>
                        <li flex={"row space-between"}>
                            <A href={"/editor2"}>Edit Fonts</A>
                            <i>keyboard_arrow_right</i>
                        </li>
                        <li flex={"row space-between"}>
                            <A href={"/editor3"}>Edit Elements</A>
                            <i>keyboard_arrow_right</i>
                        </li>
                    </ul>
                </section>
            </div>
            {props.children}
        </Show>
    </>
}
