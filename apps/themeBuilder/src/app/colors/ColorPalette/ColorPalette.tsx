import {createMemo, createSignal, For, Loading, Match, Show, Switch} from "solid-js";
import {ColorPaletteRow, getColorPalette} from "~/app/colors/ColorRepository";
import style from "../colors.module.css"
import {ColorDefinition} from "~/models/ColorDefinition";


export function ColorPalette(props: { selected: ColorDefinition, onColorClicked: (color: string) => void, onColorShiftClicked: (color: string) => void }) {

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

    const [isSearching, setIsSearching] = createSignal(false)

    const [searchTerm, setSearchTerm] = createSignal("")

    function onSearchBlur() {
        if (searchTerm() === "") {
            setIsSearching(false)
        }
    }

    function onClearClicked() {
        setSearchTerm("")
        setIsSearching(false)
    }

    const searchedColors = createMemo(() => {
        return filteredColors().filter(color => color.color_name.toLowerCase().includes(searchTerm().toLowerCase()))
    })

    function onColorClicked(color: ColorPaletteRow, e: MouseEvent) {
        if (e.shiftKey) {
            props.onColorShiftClicked(color.hex_value)
        } else {
            props.onColorClicked(color.hex_value)
        }
    }

    const [isAscending, setIsAscending] = createSignal(false)
    const [colorToSort, setColorToSort] = createSignal<"red" | "green" | "blue" | "grayscale" | null>(null)

    function onSortClicked(color: "red" | "green" | "blue" | "grayscale", e: MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (colorToSort() === color && !isAscending()) {
            setIsAscending(true)
        } else if (colorToSort() === color && isAscending()) {
            setColorToSort(null)
            setIsAscending(false)
        } else {
            setColorToSort(color)
            setIsAscending(false)
        }
    }

    const isSearchView = () => isSearching() || colorToSort() != null

    function getSortValue(color: ColorPaletteRow) {
        switch (colorToSort()) {
            case "red":
                return color.redness;
            case "green":
                return color.greenness;
            case "blue":
                return color.blueness;
            case "grayscale":
                return color.lightness;
        }
    }

    const searchedAndSortedColors = createMemo(() => {
        if (colorToSort() == null) return searchedColors()
        const sorted = searchedColors().toSorted((a, b) => {
            const aShade = getSortValue(a) ?? 0 ;
            const bShade = getSortValue(b) ?? 0;
            return isAscending() ? aShade - bShade : bShade - aShade;
        })
        return sorted.filter(color => color.color_name.toLowerCase().includes(searchTerm().toLowerCase()))
    })

    return <article class="elevated h-full flex flex-col gap-2">
        <hgroup class="flex flex-row justify-between items-center">
            <div class="flex flex-row gap-4 items-center w-160">
                <input-shell class="flat h-12 py-2 flex-1 flex flex-row gap-2 items-center">
                    <i>search</i>
                    <input
                        value={searchTerm()}
                        onInput={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearching(true)}
                        onBlur={() => onSearchBlur()}
                        placeholder="Search"/>
                    <Show when={searchTerm().length > 0}>
                        <button onClick={onClearClicked} class="text flex items-center gap-2">
                            <i>close</i>
                        </button>
                    </Show>
                </input-shell>
                <input-shell class={["flat h-12 py-2 flex flex-row gap-4 items-center"]}>
                    <i>filter_list</i>
                    <button onClick={(e) => onSortClicked("red", e)}
                            class={[style.colorFilterButton, style.red, { [style.active]: colorToSort() === "red"}, "flat flex items-center gap-2 aspect-square w-4 p-3"]}>
                    </button>
                    <button onClick={(e) => onSortClicked("green", e)}
                            class={[style.colorFilterButton, style.green, { [style.active]: colorToSort() === "green"}, "flat flex items-center gap-2 aspect-square w-4 p-3"]}>
                    </button>
                    <button onClick={(e) => onSortClicked("blue", e)}
                            class={[style.colorFilterButton, style.blue, { [style.active]: colorToSort() === "blue"}, "flat flex items-center gap-2 aspect-square w-4 p-3"]}>
                    </button>
                    <button onClick={(e) => onSortClicked("grayscale", e)}
                            class={[style.colorFilterButton, style.grayscale,  { [style.active]: colorToSort() === "grayscale"}, "flat flex items-center gap-2 aspect-square w-4 p-3"]}>
                    </button>
                    <Switch fallback={<i>&nbsp;</i>}>
                        <Match when={colorToSort() != null && !isAscending()}>
                            <i>arrow_downward</i>
                        </Match>
                        <Match when={colorToSort() != null && isAscending()}>
                            <i>arrow_upward</i>
                        </Match>
                    </Switch>
                </input-shell>
            </div>
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
                                <div onClick={(event) => onColorClicked(color(), event)} class={["w-10 h-10", style.colorPresentationCompact]} style={{ ["background-color"]: color().hex_value }}>
                                    <Show when={color().hex_value === props.selected.hex}>
                                        <i>check</i>
                                    </Show>
                                </div>
                            </>)}</For>
                        </div>
                    </div>)}</For>
                </>}>
                    <ul class="flex flex-col gap-4">
                        <For each={searchedAndSortedColors()}>{(color) => <>
                            <li class="flex flex-row gap-6 items-center">
                                <div onClick={(event) => onColorClicked(color(), event)} class={["aspect-square w-10", style.colorPresentationCompact]} style={{ ["background-color"]: color().hex_value }}></div>
                                <hgroup>
                                    <h4 class="titleMd">{color().color_name}</h4>
                                    <span>{color().hex_value}</span>
                                </hgroup>
                            </li>
                            <hr/>
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
