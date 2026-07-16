import {ColorTokenCard} from "~/app/colors/ColorList/ColorTokenCard.tsx";
import {ColorAddCard} from "~/app/colors/ColorList/ColorAddCard";
import {useColorListScope} from "~/app/colors/ColorList/ColorListScope";
import {For, Loading} from "solid-js";
import {ColorTokenDefinition} from "~/models/ColorTokenDefinition.ts";
import {useNavigate} from "@web/router";
import {useColorNameUtils} from "~/app/colors/ColorUtils";

export default function ColorList() {

    const {tokens, theme} = useColorListScope()
    const navigate = useNavigate()
    function onColorClicked(color: ColorTokenDefinition) {
        navigate(`/editor/${theme().id}/colors/${color.id}`)
    }

    const {variableNameToTitle} = useColorNameUtils()
    return <div class={"flex flex-col gap-8 p-8"}>
        <h2>Color Palette</h2>
        <div class={"grid grid-cols-[repeat(auto-fit,minmax(150px,350px))] gap-6"}>
            <Loading fallback={<div>Loading...</div>}>
                <For each={tokens}>{
                    color => <ColorTokenCard
                        id={color.id}
                        className={color.cssClass}
                        name={variableNameToTitle(color.name)}
                        onClick={() => onColorClicked(color)} />}
                </For>
                <ColorAddCard />
            </Loading>
        </div>
    </div>
}
