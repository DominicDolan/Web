import style from "../colors.module.css"
import {createMemo, For} from "solid-js"
import {useColorListScope} from "~/app/colors/ColorList/ColorListScope.ts";

export function ColorTokenCard(props: { id: string, name: string, className: string, onClick: () => void }) {

    const {getColorValues} = useColorListScope()

    const colorValues = createMemo(() => getColorValues(props.id))

    const hasName = createMemo(() => props.name != null && props.name.length > 0)
    return <article class={"flat flex flex-col gap-4"} onClick={props.onClick} role="button">
        <div class={[style.colorHeader, "p-0 overflow-hidden flex flex-wrap"]}>
            <For each={colorValues()}>{(value) => {
                function getColorOrDefault() {
                    if (value.hex == null || value.hex.length == 0) {
                        return "#000000";
                    }
                    return value.hex;
                }

                return <div
                    class={[style.colorPresentation, "h-30 relative flex basis-25 grow items-center justify-center font-bold text-xl"]}
                    style={`--presentation-color: ${getColorOrDefault()}; color: ${value.onHex}`}>
                    <code class="absolute right-2 bottom-2">{value.colorScheme}</code>
                </div>;
            }}</For>
        </div>
        <hgroup class={hasName() ? "accent" : "primary"}>
            <h3 class={hasName() ? "" : "text-(--info-color)"}>{hasName() ? props.name : "Unnamed"}&nbsp;</h3>
        </hgroup>

    </article>
}
