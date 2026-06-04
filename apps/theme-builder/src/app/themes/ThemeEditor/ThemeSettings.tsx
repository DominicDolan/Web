import {action, createMemo, createSignal, For, Loading, Match, Show, Switch} from "solid-js";
import {A, useLocation, useNavigate} from "@web/router";
import {useThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ThemeDefinition} from "~/models/ThemeDefinition";
import {validateTheme} from "~/app/themes/ThemeEditor/ThemeRepository.server.ts";
import {debounce} from "@web/utils/Debounce.ts";
import {$ZodIssue} from "zod/v4/core";
// import ColorList from "~/app/colors/ColorList/ColorList";
// import {TypefaceList} from "~/app/typography/TypefaceList/TypefaceList";

export default function ThemeSettings(props: { children?: any, theme: ThemeDefinition }) {

    const {
        themes,
        updateTheme,
        deleteTheme
    } = useThemesListScope()

    const navigate = useNavigate()
    const location = useLocation()


    async function remove() {
        const themeIndex = themes.findIndex(t => t.id === props.theme.id)
        if (themeIndex === -1) return

        const newTheme = themes[themeIndex + 1] ?? themes[themeIndex - 1]
        await deleteTheme(props.theme.id)
        if (newTheme != null) {
            navigate("/editor/" + (newTheme.id))
        } else {
            navigate("/editor")
        }
    }

    function onBlur() {
        saveChanges()
    }

    function saveChanges() {

    }

    const [formRef, setFormRef] = createSignal<HTMLFormElement | null>(null)
    const [formData, setFormData] = createSignal<FormData | null>(null)

    const setFormDataDebounced = debounce(() => {
        const form = formRef()
        if (form == null) return

        console.log(form?.elements)
        for (const element of form?.elements) {
            console.log(element)
        }

        const formData = new FormData(form ?? undefined)

        setFormData(formData)
    }, 500)


    const issues = createMemo<$ZodIssue[]>(async () => {
        if (formData() == null) return []
        const result = await validateTheme(formData())
        if (!result.success && result.error.message != null) {
            return JSON.parse(result.error.message)
        }
        return []
    })

    function validationMessageByField(path: string): string {
        return issues().find(issue => issue.path[0] === path)?.message ?? ""
    }


    function onFormSubmitted(e: Event) {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        const entries = Object.fromEntries(formData)
        console.log(entries)
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
            <form onSubmit={onFormSubmitted}
                  ref={setFormRef}
                class={"themeSettings py-6 px-6 flex flex-col items-center"}>
                <section class={"w-full flex flex-col gap-4 mb-8"}>
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
                    <form-field class={"flex flex-col gap-2"}>
                        <label>Name</label>
                        <input-shell>
                            <input type={"text"} value={props.theme.name ?? ""}
                                   name="name"
                                   onInput={setFormDataDebounced}
                                   onBlur={() => setFormDataDebounced.flush()}
                                   required/>
                        </input-shell>
                        <output>{validationMessageByField("name")}</output>
                    </form-field>
                    <form-field class={"flex flex-col gap-2"}>
                        <label>CSS Class</label>
                        <input-shell>
                            <input type={"text"} value={props.theme?.class ?? ""}
                                   name="class"
                                   onInput={setFormDataDebounced}
                                   onBlur={() => setFormDataDebounced.flush()}
                                   required/>
                        </input-shell>
                    </form-field>
                    <form-field class={"flex flex-col gap-2"}>
                        <label>Description</label>
                        <textarea
                            value={props.theme.description ?? ""}
                            name="description"
                            onInput={setFormDataDebounced}
                            onBlur={() => setFormDataDebounced.flush()}></textarea>
                    </form-field>
                    <button>Save</button>
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
            </form>
            <div class="content overflow-y-auto">
                {/*<Switch>*/}
                {/*    <Match when={location.segments()[2] === "typography"}>*/}
                {/*        <TypefaceList/>*/}
                {/*    </Match>*/}
                {/*    <Match when={location.segments()[2] === "elements"}>*/}
                {/*        <div>Elements</div>*/}
                {/*    </Match>*/}
                {/*    <Match when={location.segments()[2] === "colors"}>*/}
                {/*        <ColorList/>*/}
                {/*    </Match>*/}
                {/*</Switch>*/}
            </div>
        </Loading>
    </>
}
