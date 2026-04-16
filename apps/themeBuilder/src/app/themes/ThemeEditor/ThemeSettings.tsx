import {For, Loading, Match, Show, Switch} from "solid-js";
import {A, useLocation, useNavigate} from "@web/router";
import {useThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ThemeDefinition} from "~/models/ThemeDefinition";
import ColorList from "~/app/colors/ColorList/ColorList";
import {TypographyList} from "~/app/typography/TypographyList/TypographyList";

export default function ThemeSettings(props: { children?: any, theme: ThemeDefinition }) {

    const {
        themes,
        renameTheme,
        removeTheme,
        changeThemeDescription,
        saveChanges,
        changeThemeClass
    } = useThemesListScope()

    const navigate = useNavigate()
    const location = useLocation()

    function rename(newName: string) {
        renameTheme(props.theme.id, newName)
    }

    function remove() {
        const themeIndex = themes.findIndex(t => t.id === props.theme.id)
        if (themeIndex === -1) return

        const newTheme = themes[themeIndex + 1] ?? themes[themeIndex - 1]
        removeTheme(props.theme.id)
        if (newTheme != null) {
            navigate("/editor/" + (newTheme.id))
        } else {
            navigate("/editor")
        }
    }

    function changeDescription(newDescription: string) {
        changeThemeDescription(props.theme.id, newDescription)
    }

    function getCssClassFromName(name: string) {
        return name
            .replace(/[^a-zA-Z0-9]/g, " ")
            .split(" ")
            .filter(word => word.length > 0)
            .map((word, index) =>
                index === 0
                    ? word.toLowerCase()
                    : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join("")
    }

    let cssClassHasBeenEdited = false
    function onNameChange(e: Event) {
        const name = (e.target as HTMLInputElement).value
        if (!cssClassHasBeenEdited) {
            const cssClass = getCssClassFromName(name)
            changeThemeClass(props.theme.id, cssClass)
        }
        rename(name)
    }

    function onCssClassChange(e: Event) {
        cssClassHasBeenEdited = true
        changeThemeClass(props.theme.id, (e.target as HTMLInputElement).value)
    }

    function onBlur() {
        saveChanges()
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
            <div
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
                            <input type={"text"} value={props.theme.name ?? ""} onInput={onNameChange} onBlur={onBlur}
                                   required/>
                        </input-shell>
                    </form-field>
                    <form-field class={"flex flex-col gap-2"}>
                        <label>CSS Class</label>
                        <input-shell>
                            <input type={"text"} value={props.theme?.class ?? ""} onInput={onCssClassChange} onBlur={onBlur}
                                   required/>
                        </input-shell>
                    </form-field>
                    <form-field class={"flex flex-col gap-2"}>
                        <label>Description</label>
                        <textarea onInput={(e) => changeDescription(e.target.value)}>{props.theme.description ?? ""}</textarea>
                    </form-field>
                </section>
                <hr class={"w-full"}/>
                <section class={"w-full flex flex-col gap-4 mt-10 mb-8"}>
                    <h2 class={"mb-2"}>Edit Theme</h2>
                    <ul class={"plain flex flex-col"}>
                        <li>
                            <A class={"flex flex-row gap-2"} href={`/editor/${props.theme.id}/colors`}>
                                <i>palette</i>
                                <span>Edit Colors</span>
                                <i class="ml-auto">keyboard_arrow_right</i>
                            </A>
                        </li>
                        <li>
                            <A class={"flex flex-row gap-2"} href={`/editor/${props.theme.id}/fonts`}>
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
            <Switch>
                <Match when={location.segments()[2] === "fonts"}>
                    <TypographyList/>
                </Match>
                <Match when={location.segments()[2] === "elements"}>
                    <div>Elements</div>
                </Match>
                <Match when={location.segments()[2] === "colors"}>
                    <ColorList/>
                </Match>
            </Switch>
        </Loading>
    </>
}
