import {A, useNavigate} from "@solidjs/router";
import {createMemo, For, onMount, Show} from "solid-js";
import {useThemeContext} from "~/app/ThemeEditor/ThemeEditor";
import {reduceDeltasToModel} from "~/packages/repository/DeltaReducer";


export function ThemeSettings(props: { children?: any, params: { themeId?: string }}) {

    const [push, { getStreamById, custom }] = useThemeContext()
    const {onReadyToSave} = custom

    const theme = createMemo(() => {
        if (props.params.themeId == null) return undefined
        const stream = getStreamById(props.params.themeId);
        if (stream == null) return undefined

        return reduceDeltasToModel(stream)
    })

    function onNameChange(e: Event) {
        const t = theme()
        if (t == null) return
        push(t.id, { name: (e.target as HTMLInputElement).value })
    }

    function onDescriptionChange(e: Event) {
        const t = theme()
        if (t == null) return
        push(t.id, { description: (e.target as HTMLInputElement).value })
    }

    function onBlur() {
        onReadyToSave()
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
                    <h2 spacing={"mb-2"}>Theme Settings</h2>
                    <form-field flex={"col gap-2"}>
                        <label>Name</label>
                        <input-shell>
                            <input type={"text"} value={theme()?.name ?? ""} onInput={onNameChange} onBlur={onBlur} required/>
                        </input-shell>
                    </form-field>
                    <form-field flex={"col gap-2"}>
                        <label>Description</label>
                        <textarea onInput={onDescriptionChange} onBlur={onBlur} >{theme()?.description ?? ""}</textarea>
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
