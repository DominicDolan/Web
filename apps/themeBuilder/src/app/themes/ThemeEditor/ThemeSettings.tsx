import {For, Loading, Show} from "solid-js";
import {A, useNavigate} from "@web/router";
import {useThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";
import {ThemeDefinition} from "~/models/ThemeDefinition";

export default function ThemeSettings(props: { children?: any, theme: ThemeDefinition }) {

    const {themes, renameTheme, removeTheme, changeThemeDescription} = useThemesListScope()

    const navigate = useNavigate()

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

    // function onNameChange(e: Event) {
    //     const t = theme()
    //     if (t == null) return
    //     const name = (e.target as HTMLInputElement).value
    //     if (!cssClassHasBeenEdited) {
    //         const cssClass = getCssClassFromName(name)
    //         pushThemeDelta(t.id, {name, class: cssClass})
    //     } else {
    //         pushThemeDelta(t.id, { name })
    //     }
    // }
    //
    // function onDescriptionChange(e: Event) {
    //     const t = theme()
    //     if (t == null) return
    //     pushThemeDelta(t.id, { description: (e.target as HTMLInputElement).value })
    // }
    //
    // function onCssClassChange(e: Event) {
    //     cssClassHasBeenEdited = true
    //     const t = theme()
    //     if (t == null) return
    //     pushThemeDelta(t.id, { class: (e.target as HTMLInputElement).value })
    // }
    //
    // function onBlur() {
    //     flushSaveAction()
    // }
    //
    // function onDeleteClick(e: MouseEvent) {
    //     const t = theme()
    //     if (t == null) return
    //
    //     // close the popover
    //     const popover = (e.currentTarget as HTMLElement).closest("[popover]") as any
    //     popover?.hidePopover?.()
    //
    //     const ok = window.confirm(`Delete theme "${t.name}"?`)
    //     if (!ok) return
    //
    //     pushThemeDelta("delete", t.id)
    //     flushSaveAction()
    //     // navigate("/editor", { replace: true })
    // }

    return <>
        <Loading fallback={<place-holder class={"loader themeSettings flex flex-col gap-8 p-8"}>
            <div class={"w-full h-3"}></div>
            <For each={Array.from({length: 3})}>
                {() => <div class={"flex flex-col gap-4"}>
                    <div class={"w-24 h-4"}></div>
                    <div class={"w-full h-5"}></div>
                </div>
                }
            </For>
        </place-holder>}>
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
                        <label>gedName</label>
                        <input-shell>
                            <input type={"text"} value={props.theme.name ?? ""} onInput={(e) => rename(e.target.value)}
                                   required/>
                        </input-shell>
                    </form-field>
                    {/*<form-field class={"flex flex-col gap-2"}>*/}
                    {/*    <label>CSS Class</label>*/}
                    {/*    <input-shell>*/}
                    {/*        <input type={"text"} value={theme()?.class ?? ""} onInput={onCssClassChange} onBlur={onBlur}*/}
                    {/*               required/>*/}
                    {/*    </input-shell>*/}
                    {/*</form-field>*/}
                    <form-field class={"flex flex-col gap-2"}>
                        <label>Description</label>
                        <textarea onInput={(e) => changeDescription(e.target.value)}>{props.theme.description ?? ""}</textarea>
                    </form-field>
                </section>
            </div>
        </Loading>
        </>

    //         return <><Show when={false}><div
    //             class={"themeSettings py-6 px-6 flex flex-col items-center justify-center"}>
    //             <section class={"w-full flex flex-col gap-4 mb-8"}>
    //                 <hgroup class={"flex flex-row items-center justify-between"}>
    //                     <h2>Theme Settings</h2>
    //                     <button
    //                         class={"text flex flex-row items-center justify-center p-2"}
    //                         popovertarget={"theme-settings-menu"}
    //                         aria-label="Theme settings menu">
    //                         <i>more_vert</i>
    //                     </button>
    //                     <ul id={"theme-settings-menu"} popover role={"menu"} position-area={"[span-right,bottom]"}>
    //                         <li onClick={onDeleteClick} class={"flex flex-row gap-2 items-center justify-center"}><i>delete</i>Delete</li>
    //                     </ul>
    //                 </hgroup>
    //                 <form-field class={"flex flex-col gap-2"}>
    //                     <label>Name</label>
    //                     <input-shell>
    //                         <input type={"text"} value={theme()?.name ?? ""} onInput={onNameChange} onBlur={onBlur}
    //                                required/>
    //                     </input-shell>
    //                 </form-field>
    //                 <form-field class={"flex flex-col gap-2"}>
    //                     <label>CSS Class</label>
    //                     <input-shell>
    //                         <input type={"text"} value={theme()?.class ?? ""} onInput={onCssClassChange} onBlur={onBlur}
    //                                required/>
    //                     </input-shell>
    //                 </form-field>
    //                 <form-field class={"flex flex-col gap-2"}>
    //                     <label>Description</label>
    //                     <textarea onInput={onDescriptionChange} onBlur={onBlur}>{theme()?.description ?? ""}</textarea>
    //                 </form-field>
    //                 <form-field class={"flex flex-col gap-2"}>
    //                     <label>Tags</label>
    //                     <select/>
    //                 </form-field>
    //             </section>
    //             <hr class={"w-full"}/>
    //             <section class={"w-full flex flex-col gap-4 mt-10 mb-8"}>
    //                 <h2 class={"mb-2"}>Edit Theme</h2>
    //                 <ul class={"plain flex flex-col"}>
    //                     <li>
    //                         <A class={"flex flex-row justify-between"} href={`/editor/${props.params.themeId}/colors`}>
    //                             <span>Edit Colors</span>
    //                             <i>keyboard_arrow_right</i>
    //                         </A>
    //                     </li>
    //                     <li>
    //                         <A class={"flex flex-row justify-between"} href={`/editor/${props.params.themeId}/fonts`}>
    //                             <span>Edit Fonts</span>
    //                             <i>keyboard_arrow_right</i>
    //             </A>
    //                     </li>
    //                     <li>
    //                         <A class={"flex flex-row justify-between"} href={`/editor/${props.params.themeId}/elements`}>
    //                             <span>Edit Elements</span>
    //                             <i>keyboard_arrow_right</i>
    //                         </A>
    //                     </li>
    //                 </ul>
    //             </section>
    //         </div>
    //         {props.children}
    //     </Show>
    // </>
}
