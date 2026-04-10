import {createMemo, createSignal, For, Loading, Show} from "solid-js";
import {ColorPaletteRow, getColorPalette} from "~/app/colors/ColorRepository";
import style from "../ColorPreview.module.css"
import {ColorDefinition} from "~/models/ColorDefinition";


export function ColorPalette(props: { selected: ColorDefinition }) {

    const colorPalette = createMemo(() => getColorPalette())
    const [selectedFilter, setFilter] = createSignal<"tailwind" | "material" | null>("tailwind")

    const filteredColors = createMemo(() => {
        if (selectedFilter() === null) return colorPalette()
        return colorPalette().filter(color => color.source === selectedFilter())
    })

    const groupedColors = createMemo(() => {
        const draft: Record<string, ColorPaletteRow[]> = {}
        filteredColors().forEach(color => {
            if (!draft[color.group_name]) draft[color.group_name] = []
            draft[color.group_name].push(color)
        })

        for (const key in draft) {
            draft[key].sort((a, b) => {
                const aShade = parseInt(a.shade ?? "0");
                const bShade = parseInt(b.shade ?? "0");
                return aShade - bShade;
            })
        }

        return draft
    })

    const groups = createMemo(() => Object.keys(groupedColors()))

    const [isSearchView, setIsSearchView] = createSignal(false)

    const [searchTerm, setSearchTerm] = createSignal("")

    function onSearchBlur() {
        if (searchTerm() === "") {
            setIsSearchView(false)
        }
    }

    function onClearClicked() {
        setSearchTerm("")
        setIsSearchView(false)
    }

    const searchedColors = createMemo(() => {
        return filteredColors().filter(color => color.color_name.toLowerCase().includes(searchTerm().toLowerCase()))
    })

    return <article class="elevated h-full flex flex-col gap-2">
        <hgroup class="flex flex-row gap-18 items-center">
            <input-shell class="tonal h-12 py-2 flex-1 flex flex-row gap-2 items-center">
                <i>search</i>
                <input
                    value={searchTerm()}
                    onInput={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchView(true)}
                    onBlur={() => onSearchBlur()}
                    placeholder="Search"/>
                <Show when={searchTerm().length > 0}>
                    <button onClick={onClearClicked} class="text flex items-center gap-2">
                        <i>close</i>
                    </button>
                </Show>
            </input-shell>
            <div class="flex items-center gap-4">
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
        <div class="flex flex-col gap-6 p-4 flex-1 overflow-y-auto">
            <Loading fallback={<div>Loading...</div>}>
                <Show when={isSearchView()} fallback={<>
                    <For each={groups()}>{(group) => (<div class="flex flex-col gap-2">
                        <h3 class={"sectionHeading"}>{group()}</h3>
                        <div class="flex flex-row gap-4">
                            <For each={groupedColors()[group()]}>{(color) => (<>
                                <div class={["w-10 h-10", style.colorPresentationCompact]} style={{ ["background-color"]: color().hex_value }}>
                                    <Show when={color().hex_value === props.selected.hex}>
                                        <i>check</i>
                                    </Show>
                                </div>
                            </>)}</For>
                        </div>
                    </div>)}</For>
                </>}>
                    <ul class="flex flex-col gap-4">
                        <For each={searchedColors()}>{(color) => <>
                            <li class="flex flex-row gap-6 items-center">
                                <div class={["aspect-square w-10", style.colorPresentationCompact]} style={{ ["background-color"]: color().hex_value }}></div>
                                <hgroup>
                                    <h4 class="titleMd">{color().color_name}</h4>
                                    <span>{color().hex_value}</span>
                                </hgroup>
                            </li>
                        </>}
                        </For>
                    </ul>
                </Show>
            </Loading>
        </div>
        <hr />
        <footer class="flex flex-row justify-between items-center p-2">
            <p>Click to select Color, Shift+Click for on-color</p>
        </footer>
    </article>
}
