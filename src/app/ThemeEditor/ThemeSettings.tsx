import {A, createAsync, useNavigate, useParams} from "@solidjs/router";
import {createEffect, For, on, onMount, Show} from "solid-js";

async function getThemeQuery(themeId: string) {
    return new Promise<any>(resolve => {
        setTimeout(() => {
            resolve({
                name: "Test Theme",
                description: "This is a test theme",
                tags: ["test", "theme"],
            })
        }, 1000)
    })
}
export function ThemeSettings(props: { children?: any, params: { themeId?: string }}) {

    const navigate = useNavigate()
    const params = useParams()

    const theme = createAsync(() => {
        return new Promise<any>(resolve => {
            createEffect(on(() => props.params.themeId, (newValue) => {
                if (newValue != null) {
                    getThemeQuery(newValue).then(resolve)
                }
            }))
        })
    })


    onMount(() => {

        console.log("mounted")
        if (props.params.themeId == null) {
            setTimeout(() => {
                navigate("1", { replace: true })
            },1000)
        } else if (props.children == null) {
            navigate(`${props.params.themeId}/colors`, { replace: true })
        }

    })
    return <>
        <Show when={props.params.themeId != null} fallback={<skeleton-loader class={"themeSettings"} flex={"col gap-8"} spacing={"pa-8"}>
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
                grid-area={"menu"}
                flex={"col center"}>
                <section sizing={"w-full"} flex={"col gap-4"} spacing={"mb-8"}>
                    <h2 spacing={"mb-2"}>Theme Settings</h2>
                    <form-field flex={"col gap-2"}>
                        <label>Name</label>
                        <input-shell>
                            <input type={"text"}/>
                        </input-shell>
                    </form-field>
                    <form-field flex={"col gap-2"}>
                        <label>Description</label>
                        <textarea/>
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
