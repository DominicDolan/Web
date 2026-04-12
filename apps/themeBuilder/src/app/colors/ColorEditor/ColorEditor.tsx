import {useColorScope} from "~/app/colors/ColorEditor/ColorScope";
import {createMemo, createSignal, Loading} from "solid-js";
import style from "../ColorPreview.module.css"
import {useColorNameUtils, useColorUtils} from "~/app/colors/ColorUtils";
import {useNavigate} from "@web/router";
import {ColorPalette} from "~/app/colors/ColorPalette/ColorPalette";

export function ColorEditor() {

    const {color, updateName, updateHex, themeId, updateAlpha, updateOnHex} = useColorScope()

    const {variableNameToTitle} = useColorNameUtils()
    const navigate = useNavigate()

    const colorName = createMemo(() => variableNameToTitle(color().name))

    function onBackClicked() {
        navigate(`/editor/${themeId()}/colors`)
    }

    const onColorVariableName = () => {
        const base = color().name.replace("--", "")

        return `--on-${base}`
    }

    const {bestContrast} = useColorUtils(() => color().hex)

    const [isOnColorSynced, setIsOnColorSynced] = createSignal(() => color().onHex == null)

    const onColorHex = createMemo(() => {
        if (isOnColorSynced() || color().onHex == null) return bestContrast()
        return color().onHex
    })

    function onColorClicked(color: string) {
        updateHex(color)
    }

    function onColorShiftClicked(color: string) {
        updateOnHex(color)
    }

    return <Loading>
        <div class="grid grid-cols-[1fr_2fr] grid-rows-[min-content_1fr] gap-x-8 gap-y-8 h-full">
            <nav class="top flex flex-row items-center gap-4 col-span-full p-4">
                <button class="text flex items-center gap-2" onClick={onBackClicked}><i>arrow_back</i> Back to Palette</button>
                <hr class="w-px h-full" />
                <h1>Edit Color</h1>
            </nav>
            <div class="flex flex-col gap-8 px-4">
                <div class="flex flex-col gap-12 px-8">
                    <section class="flex flex-col gap-2">
                        <h2>Preview</h2>
                        <div
                            class={[style.colorPresentation, "col-span-full h-64 mx-4"]}
                            style={`--presentation-color: ${color().hex}; --on-presentation-color: ${onColorHex()}; --alpha: ${color().alpha};`}>
                            <span class={[style.hexPresentation, "flex items-center justify-center"]}>{color().hex}</span>
                        </div>
                    </section>
                    <section class="flex flex-col gap-8">
                        <h2>{colorName()}</h2>
                        <div class="grid grid-cols-[1fr_1fr] gap-y-8 gap-x-4 px-4">
                            <form-field class="col-span-full flex flex-col">
                                <label for="cssVariableName">CSS Variable Name</label>
                                <div class="flex flex-row items-center gap-2">
                                    <input class="flex-1" id="cssVariableName" type="text" value={color().name} onInput={e => updateName(e.currentTarget.value, true)}/>
                                    <button class="text">
                                        <i>content_copy</i>
                                    </button>
                                </div>
                            </form-field>
                            <form-field class="flex flex-col">
                                <label for="colorHex">Color Hex</label>
                                <input-shell class="flex gap-2 h-full p-0">
                                    <input id="colorHex" type="color" class="h-full w-9 py-1 pl-2" value={color().hex} onInput={e => updateHex(e.currentTarget.value)}/>
                                    <input id="colorHex" type="text" value={color().hex} onInput={e => updateHex(e.currentTarget.value, true)}/>
                                </input-shell>
                            </form-field>
                            <form-field class="flex flex-col">
                                <label for="cssClass">CSS Class</label>
                                <input id="cssClass" type="text"/>
                            </form-field>
                            <form-field class="flex flex-col col-span-full">
                                <div class="flex flex-row justify-between">
                                    <label for="alpha">Opacity</label>
                                    <span>{color().alpha}</span>
                                </div>
                                <input id="alpha" type="range" min={0} max={1} step={0.01} value={color().alpha} onInput={e => updateAlpha(parseFloat(e.currentTarget.value), true)}/>
                            </form-field>
                        </div>
                    </section>
                    <section class="flex flex-col gap-8">
                        <h2>On {colorName()}</h2>
                        <div class="grid grid-cols-[1fr_1fr] gap-y-8 gap-x-4 px-4">
                            <form-field>
                                <label for="onColorVariableName">Variable Name</label>
                                <input id="onColorVariableName" disabled value={onColorVariableName()} class="w-full"/>
                            </form-field>
                            <form-field class="flex flex-col">
                                <label for="colorHex">Color Hex</label>
                                <div class="flex gap-2 h-full">
                                    <input-shell class="flex gap-2 h-full p-0">
                                        <input
                                            id="colorHex"
                                            type="color"
                                            class="h-full w-9 py-1 pl-2"
                                            disabled={isOnColorSynced()}
                                            value={onColorHex()}
                                            onInput={e => updateHex(e.currentTarget.value)}/>
                                        <input
                                            id="colorHex"
                                            type="text"
                                            disabled={isOnColorSynced()}
                                            value={onColorHex()}
                                            onInput={e => updateHex(e.currentTarget.value, true)}/>
                                    </input-shell>
                                    <button class={isOnColorSynced() ? "outlined active" : "outlined"} onClick={() => setIsOnColorSynced(!isOnColorSynced())}>
                                        <i>sync</i>
                                    </button>
                                </div>
                            </form-field>
                        </div>
                    </section>
                </div>
            </div>
            <div class="px-4 h-full min-h-0 pb-6">
                <ColorPalette selected={color()} onColorClicked={onColorClicked} onColorShiftClicked={onColorShiftClicked}/>
            </div>
        </div>
    </Loading>
}
