import {useColorScope} from "~/app/colors/ColorEditor/ColorScope";
import {createMemo, createSignal, Loading} from "solid-js";
import style from "../ColorPreview.module.css"
import {useColorNameUtils} from "~/app/colors/ColorNameUtils";
import {useNavigate} from "@web/router";
import {getColorPalette} from "~/app/colors/ColorRepository";
import {ColorPalette} from "~/app/colors/ColorPalette/ColorPalette";

export function ColorEditor() {

    const {color, updateName, updateHex, themeId} = useColorScope()

    const {variableNameToTitle} = useColorNameUtils()
    const navigate = useNavigate()

    const colorName = createMemo(() => variableNameToTitle(color().name))

    function onBackClicked() {
        navigate(`/editor/${themeId()}/colors`)
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
            <div class="px-4 h-full min-h-0 pb-6">
                <ColorPalette selected={color()}/>
            </div>
        </div>
    </Loading>
}
