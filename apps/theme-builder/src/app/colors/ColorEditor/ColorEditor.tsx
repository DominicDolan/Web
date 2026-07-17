import {useColorScope} from "~/app/colors/ColorEditor/ColorScope";
import {createMemo, createSignal, For, Loading} from "solid-js";
import style from "../colors.module.css"
import {useColorNameUtils, useColorUtils} from "~/app/colors/ColorUtils";
import {useNavigate} from "@web/router";
import {ColorPalette} from "~/app/colors/ColorPalette/ColorPalette";
import {SubPageTemplate} from "~/components/SubPageTemplate";

export function ColorEditor() {
    const {
        token,
        colorValue,
        colorSchemeNames,
        updateName,
        updateCssClass,
        updateHex,
        themeId,
        updateAlpha,
        updateOnHex,
    } = useColorScope()

    const {variableNameToTitle} = useColorNameUtils()
    const navigate = useNavigate()
    const [selectedColorScheme, setSelectedColorScheme] = createSignal<string>()

    const selectedScheme = createMemo(() => selectedColorScheme() ?? colorSchemeNames()[0])
    const value = createMemo(() => colorValue(selectedScheme()))
    const colorName = createMemo(() => variableNameToTitle(token().name))
    const onColorVariableName = createMemo(() => `--on-${token().name.replace("--", "")}`)
    const {bestContrast} = useColorUtils(() => value()?.hex ?? "#000000")
    const [isOnColorSynced, setIsOnColorSynced] = createSignal(true)
    const onColorHex = createMemo(() => isOnColorSynced() ? bestContrast() : value()?.onHex ?? bestContrast())

    function onBackClicked() {
        navigate(`/editor/${themeId()}/colors`)
    }

    function onColorClicked(hex: string) {
        updateHex(selectedScheme(), hex)
    }

    function onColorShiftClicked(hex: string) {
        setIsOnColorSynced(false)
        updateOnHex(selectedScheme(), hex)
    }

    return <Loading>
        <SubPageTemplate onBackClicked={onBackClicked} title="Edit Color" backButtonText="Back to Palette">
            <div class="flex flex-col gap-6 h-full min-h-0">
                <ul role="tablist" class="underlined flex gap-2 px-4" aria-label="Colour scheme">
                    <For each={colorSchemeNames()}>{scheme =>
                        <li
                            role="tab"
                            aria-selected={selectedScheme() === scheme ? "true" : "false"}
                            class="px-4 py-2"
                            onClick={() => setSelectedColorScheme(scheme)}>
                            {scheme}
                        </li>
                    }</For>
                </ul>
                <div class="grid grid-cols-[1fr_2fr] gap-x-8 flex-1 min-h-0">
                    <div class="flex flex-col gap-8 px-4 overflow-auto">
                        <section class="flex flex-col gap-2 px-8">
                            <h2>Preview</h2>
                            <div
                                class={[style.colorPresentation, "h-64 mx-4"]}
                                style={`--presentation-color: ${value()?.hex}; --on-presentation-color: ${onColorHex()}; --alpha: ${value()?.alpha};`}>
                                <span class={[style.hexPresentation, "flex items-center justify-center"]}>{value()?.hex}</span>
                            </div>
                        </section>
                        <section class="flex flex-col gap-8 px-8">
                            <h2>{colorName()}</h2>
                            <div class="grid grid-cols-[1fr_1fr] gap-y-8 gap-x-4 px-4">
                                <form-field class="col-span-full flex flex-col">
                                    <label for="cssVariableName">CSS Variable Name</label>
                                    <input id="cssVariableName" type="text" value={token().name} onInput={e => updateName(e.currentTarget.value, true)}/>
                                </form-field>
                                <form-field class="flex flex-col">
                                    <label for="colorHex">Color Hex</label>
                                    <input-shell class="flex gap-2 h-full p-0">
                                        <input id="colorPicker" type="color" class="h-full w-9 py-1 pl-2" value={value()?.hex} onInput={e => updateHex(selectedScheme(), e.currentTarget.value)}/>
                                        <input id="colorHex" type="text" value={value()?.hex} onInput={e => updateHex(selectedScheme(), e.currentTarget.value, true)}/>
                                    </input-shell>
                                </form-field>
                                <form-field class="flex flex-col">
                                    <label for="cssClass">CSS Class</label>
                                    <input id="cssClass" type="text" value={token().cssClass} onInput={e => updateCssClass(e.currentTarget.value, true)}/>
                                </form-field>
                                <form-field class="flex flex-col col-span-full">
                                    <div class="flex flex-row justify-between">
                                        <label for="alpha">Opacity</label>
                                        <span>{value()?.alpha}</span>
                                    </div>
                                    <input id="alpha" type="range" min={0} max={1} step={0.01} value={value()?.alpha} onInput={e => updateAlpha(selectedScheme(), parseFloat(e.currentTarget.value), true)}/>
                                </form-field>
                            </div>
                        </section>
                        <section class="flex flex-col gap-8 px-8">
                            <h2>On {colorName()}</h2>
                            <div class="grid grid-cols-[1fr_1fr] gap-y-8 gap-x-4 px-4">
                                <form-field class="flex flex-col">
                                    <label for="onColorVariableName">Variable Name</label>
                                    <input id="onColorVariableName" disabled value={onColorVariableName()} class="w-full"/>
                                </form-field>
                                <form-field class="flex flex-col">
                                    <label for="onColorHex">Color Hex</label>
                                    <div class="flex gap-2 h-full">
                                        <input-shell class="flex gap-2 h-full p-0">
                                            <input id="onColorPicker" type="color" class="h-full w-9 py-1 pl-2" disabled={isOnColorSynced()} value={onColorHex()} onInput={e => updateOnHex(selectedScheme(), e.currentTarget.value)}/>
                                            <input id="onColorHex" type="text" disabled={isOnColorSynced()} value={onColorHex()} onInput={e => updateOnHex(selectedScheme(), e.currentTarget.value, true)}/>
                                        </input-shell>
                                        <button class="outlined py-1 px-2 flex flex-row items-center" aria-pressed={isOnColorSynced() ? "true" : "false"} onClick={() => setIsOnColorSynced(!isOnColorSynced())}>
                                            <i>sync</i>
                                        </button>
                                    </div>
                                </form-field>
                            </div>
                        </section>
                    </div>
                    <div class="px-4 min-h-0 pb-6">
                        <ColorPalette selected={value()!} onColorClicked={onColorClicked} onColorShiftClicked={onColorShiftClicked}/>
                    </div>
                </div>
            </div>
        </SubPageTemplate>
    </Loading>
}
