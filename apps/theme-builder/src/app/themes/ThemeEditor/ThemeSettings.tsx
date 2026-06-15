import {For, Loading, Switch, Match} from "solid-js";
import {A, useLocation, useNavigate} from "@web/router";
import {useThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ThemeDefinition} from "~/models/ThemeDefinition";
import {validateTheme} from "~/app/themes/ThemeEditor/ThemeRepository.server.ts";
import {useFormValidator} from "@web/components"
import ColorList from "~/app/colors/ColorList/ColorList.tsx";
import {TypefaceList} from "~/app/typography/TypefaceList/TypefaceList";

export default function ThemeSettings(props: { children?: any, theme: ThemeDefinition }) {

    const {
        themes,
        updateThemeLocal,
        saveDeltas,
        deleteThemeAndSave,
    } = useThemesListScope()

    const navigate = useNavigate()
    const location = useLocation()

    async function remove() {
        const themeIndex = themes.findIndex(t => t.id === props.theme.id)
        if (themeIndex === -1) return

        const newTheme = themes[themeIndex + 1] ?? themes[themeIndex - 1]

        await deleteThemeAndSave(props.theme.id)

        if (newTheme != null) {
            navigate("/editor/" + (newTheme.id))
        } else {
            navigate("/editor")
        }
    }

    function validateForm(formData: FormData) {
        const model = {
            id: props.theme.id,
            updatedAt: Date.now(),
            ...Object.fromEntries(formData)
        }

        return validateTheme(model)
    }

    const {setFormRef, issueMessageByName, validity} = useFormValidator(validateForm, () => saveDeltas())

    function updateFieldLocal(field: string, e: Event) {
        const value = (e.target as HTMLInputElement).value
        updateThemeLocal(props.theme.id, {
            [field]: value
        })
    }

    return <>
        <Loading fallback={<empty-state class={"loader themeSettings flex flex-col gap-8 p-8"}>
            <div class={"w-full h-3"}></div>
            <For each={Array.from({length: 3})}>
                {() => <div class={"flex flex-col gap-4"}>
                    <div class={"w-24 h-4"}></div>
                    <div class={"w-full h-5"}></div>
                </div>
                }
            </For>
        </empty-state>}>
            <div class={"themeSettings py-6 px-6 flex flex-col items-center"}>
                <section class={"w-full flex flex-col gap-4"}>
                    <hgroup class={"flex flex-row items-center justify-between"}>
                        <h2>Theme Settings</h2>
                        <button
                            class={"text flex flex-row items-center justify-center p-2"}
                            popovertarget={"theme-settings-menu"}
                            aria-label="Theme settings menu">
                            <i>more_vert</i>
                        </button>
                        <ul id={"theme-settings-menu"} class={"[position-area:span-right_bottom]"} popover role={"menu"}>
                            <li onClick={() => remove()} class={"flex flex-row gap-2 items-center justify-center"}><i>delete</i>Delete</li>
                        </ul>
                    </hgroup>
                    <form ref={setFormRef} class={"p-0 m-0"}>
                        <form-field class={"flex flex-col gap-2"}>
                            <label>Name</label>
                            <input-shell>
                                <input type={"text"}
                                       value={props.theme.name ?? ""}
                                       onInput={(e) => updateFieldLocal("name", e)}
                                       name="name"
                                       required/>
                            </input-shell>
                            <output>{issueMessageByName("name")}</output>
                        </form-field>
                        <form-field class={"flex flex-col gap-2"}>
                            <label>CSS Class</label>
                            <input-shell>
                                <input type={"text"}
                                       value={props.theme?.class ?? ""}
                                       onInput={(e) => updateFieldLocal("class", e)}
                                       name="class"
                                       required/>
                            </input-shell>
                            <output>{issueMessageByName("class")}</output>
                        </form-field>
                        <form-field class={"flex flex-col gap-2"}>
                            <label>Description</label>
                            <textarea
                                value={props.theme.description ?? ""}
                                onInput={(e) => updateFieldLocal("description", e)}
                                name="description"></textarea>
                            <output>{issueMessageByName("class")}</output>
                        </form-field>
                        <button disabled={validity() === "invalid"}>Save</button>
                    </form>
                </section>
                <hr class={"w-full"}/>
                <section class={"w-full flex flex-col gap-4 mt-10 mb-8"}>
                    <h2 class={"mb-2"}>Edit Theme</h2>
                    <ul class={"plain flex flex-col gap-1"}>
                        <li>
                            <A class={"flex flex-row gap-2"} href={`/editor/${props.theme.id}/colors`}>
                                <i>palette</i>
                                <span>Edit Colors</span>
                                <i class="ml-auto">keyboard_arrow_right</i>
                            </A>
                        </li>
                        <li>
                            <A class={"flex flex-row gap-2"} href={`/editor/${props.theme.id}/typography`}>
                                <i>format_size</i>
                                <span>Edit Fonts</span>
                                <i class="ml-auto">keyboard_arrow_right</i>
                            </A>
                        </li>
                        <li>
                            <A class={"flex flex-row gap-2"} href={`/editor/${props.theme.id}/elements`}>
                                <i>code</i>
                                <span>Edit Elements</span>
                                <i class="ml-auto">keyboard_arrow_right</i>
                            </A>
                        </li>
                    </ul>
                </section>
            </div>
            <div class="content overflow-y-auto">
                <Switch>
                    <Match when={location.segments()[2] === "typography"}>
                        <TypefaceList/>
                    </Match>
                {/*    <Match when={location.segments()[2] === "elements"}>*/}
                {/*        <div>Elements</div>*/}
                {/*    </Match>*/}
                    <Match when={location.segments()[2] === "colors"}>
                        <ColorList/>
                    </Match>
                </Switch>
            </div>
        </Loading>
    </>
}
