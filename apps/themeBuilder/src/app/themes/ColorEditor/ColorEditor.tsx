import {useColorScope} from "~/app/themes/ColorEditor/ColorScope";
import {createMemo, createSignal, Loading} from "solid-js";
import style from "./ColorEditCard.module.css"
import {useColorNameUtils} from "~/app/themes/ColorEditor/ColorNameUtils";
import {useNavigate} from "@web/router";

export function ColorEditor() {

    const {color, updateName, updateHex, themeId} = useColorScope()

    const {variableNameToTitle} = useColorNameUtils()
    const [selectedFilter, setFilter] = createSignal<"tailwind" | "material" | null>("tailwind")
    const navigate = useNavigate()

    const colorName = createMemo(() => variableNameToTitle(color().name))

    function onBackClicked() {
        navigate(`/editor/${themeId()}/colors`)
    }

    return <Loading>
        <div class="grid grid-cols-[1fr_2fr] gap-x-8 gap-y-8">
            <nav class="top flex flex-row items-center gap-4 col-span-full p-4">
                <button class="text flex items-center gap-2" onClick={onBackClicked}><i>arrow_back</i> Back to Palette</button>
                <hr class="w-px h-full" />
                <h1>Edit Color</h1>
            </nav>
            <div class="flex flex-col gap-8 px-4">
                <div class="flex flex-col gap-12 px-8">
                    <section class="flex flex-col gap-2">
                        <h2>Preview</h2>
                        <div class={[style.colorPresentation, "col-span-full h-64 mx-4"]} style={`--presentation-color: ${color().hex};`}></div>
                    </section>
                    <section class="flex flex-col gap-8">
                        <h2>Details</h2>
                        <div class="grid grid-cols-[1fr_1fr] gap-y-8 gap-x-4 px-4">
                            <div class="col-span-full flex flex-col">
                                <h3 class={"min-h-6"}>{colorName()}</h3>
                            </div>
                            <form-field class="col-span-full flex flex-col">
                                <label for="cssVariableName">CSS Variable Name</label>
                                <div class="flex flex-row items-center gap-2">
                                    <input class="flex-1" id="cssVariableName" type="text" value={color().name} onInput={e => updateName(e.currentTarget.value)}/>
                                    <button class="text">
                                        <i>content_copy</i>
                                    </button>
                                </div>
                            </form-field>
                            <form-field class="flex flex-col">
                                <label for="colorHex">Color Hex</label>
                                <input id="colorHex" type="text" value={color().hex} onInput={e => updateHex(e.currentTarget.value)}/>
                            </form-field>
                            <form-field class="flex flex-col">
                                <label for="cssClass">CSS Class</label>
                                <input id="cssClass" type="text"/>
                            </form-field>
                        </div>
                    </section>
                </div>
            </div>
            <div class="px-4">
                <article class="elevated h-full">
                    <hgroup class="flex flex-row justify-between items-center">
                        <h2>Color Library</h2>
                        <div class="flex items-center gap-2">
                            <button class="text flex items-center gap-2" onClick={() => setFilter(null)}>
                                <i>palette</i>
                                <span>All</span>
                            </button>
                            <ul role="radiogroup" class="flex flex-row gap-2 px-3 py-2">
                                <li role="button" class={`px-4 py-2 flex gap-1 items-center ${ selectedFilter() === "tailwind" ? 'active' : ''}`} onClick={() => setFilter("tailwind")}>
                                    <img src="/img/tailwind-icon.svg" alt="Tailwind CSS Icon" class="aspect-square w-5"/>
                                    <span>Tailwind</span>
                                </li>
                                <li role="button" class={`px-4 py-2 flex gap-1 items-center ${ selectedFilter() === "material" ? 'active' : ''}`} onClick={() => setFilter("material")}>
                                    <img src="/img/material-design-icon.svg" alt="Material Design Icon" class="aspect-square w-5"/>
                                    <span>Material</span>
                                </li>
                            </ul>
                        </div>
                    </hgroup>
                </article>
            </div>
        </div>
    </Loading>
}
