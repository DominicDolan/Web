import {ColorEditCard} from "~/app/themes/ColorEditor/ColorEditCard";
import {ColorAddCard} from "~/app/themes/ColorEditor/ColorAddCard";
import {useColorListScope} from "~/app/themes/ColorEditor/ColorListScope";
import {For, Loading} from "solid-js";
import {ColorDefinition} from "~/models/ColorDefinition";
import {useNavigate} from "@web/router";
import {useColorNameUtils} from "~/app/themes/ColorEditor/ColorNameUtils";

export default function ColorList() {

    const {colors, theme} = useColorListScope()
    const navigate = useNavigate()
    function onColorClicked(color: ColorDefinition) {
        navigate(`/editor/${theme().id}/colors/${color.id}`)
    }

    const {variableNameToTitle} = useColorNameUtils()
    return <div class={"flex flex-col gap-8 p-8"}>
        <h2>Color Palette</h2>
        <div class={"grid grid-cols-[repeat(auto-fit,minmax(150px,350px))] gap-6"}>
            <Loading fallback={<div>Loading...</div>}>
                <For each={colors}>{
                    color => <ColorEditCard
                        name={variableNameToTitle(color().name)}
                        color={color().hex}
                        onClick={() => onColorClicked(color())} />}
                </For>
                <ColorAddCard />
            </Loading>
        </div>
    </div>
}
