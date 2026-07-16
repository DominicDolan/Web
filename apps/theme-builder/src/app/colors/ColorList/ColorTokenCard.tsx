import style from "../colors.module.css"
import {createMemo, For} from "solid-js"
import {useColorUtils} from "~/app/colors/ColorUtils";
import {useColorListScope} from "~/app/colors/ColorList/ColorListScope.ts";

export function ColorTokenCard(props: { id: string, name: string, className: string, onClick: () => void }) {

    const {getColorValues} = useColorListScope()

    const colorValues = createMemo(() => getColorValues(props.id))

    return <article class={"flat flex flex-col gap-4"} onClick={props.onClick} role="button">
        <hgroup>
            <h3>{props.name}&nbsp;</h3>
            <p>{props.className}</p>
        </hgroup>
        <For each={colorValues()}>{(value) => {
            function getColorOrDefault() {
                if (value.hex == null || value.hex.length == 0) {
                    return "#000000";
                }
                return value.hex;
            }

            return <div
                class={[style.colorPresentation, "w-full h-30 relative flex items-center justify-center font-bold text-xl"]}
                style={`--presentation-color: ${getColorOrDefault()}; color: ${value.onHex}`}>
                <code class="absolute right-2 bottom-2">{value.hex}</code>
            </div>;
        }}</For>

    </article>
}
