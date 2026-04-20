import style from "../colors.module.css"
import { createMemo } from "solid-js"
import {useColorUtils} from "~/app/colors/ColorUtils";

export function ColorEditCard(props: { name: string, color: string, onClick: () => void }) {
    const {rgb, hsl, contrastRatio, bestContrast} = useColorUtils(() => props.color)

    const largeTextSuccess = createMemo(() => contrastRatio() >= 4.5)
    const largeTextWarning = createMemo(() => contrastRatio() < 4.5 && contrastRatio() >= 3)
    const largeTextError = createMemo(() => contrastRatio() < 3)

    const smallTextSuccess = createMemo(() => contrastRatio() >= 7)
    const smallTextWarning = createMemo(() => contrastRatio() < 7 && contrastRatio() >= 4.5)
    const smallTextError = createMemo(() => contrastRatio() < 4.5)

    const largeTextClass = () => ({
        "success": largeTextSuccess(),
        "warning": largeTextWarning(),
        "error": largeTextError(),
    })

    const smallTextClass = () => ({
        "success": smallTextSuccess(),
        "warning": smallTextWarning(),
        "error": smallTextError(),
    })

    return <article class={"tonal flex flex-col gap-4"} onClick={props.onClick} role="button">
        <hgroup>
            <h3>{props.name}&nbsp;</h3>
        </hgroup>
        <div class={[style.colorPresentation, "w-full h-30 relative flex items-center justify-center font-bold text-xl"]}
             style={`--presentation-color: ${props.color}; color: ${bestContrast()}`}>
            <code class="absolute right-2 bottom-2">{props.color}</code>
        </div>
        <div class={"flex flex-col gap-2"}>
            <div class={"flex justify-between"}>
                <span>RGB</span>
                <code>{rgb() ? `${rgb()!.r}, ${rgb()!.g}, ${rgb()!.b}` : "N/A"}</code>
            </div>
            <div class={"flex justify-between"}>
                <span>HSL</span>
                <code>{hsl() ? `${hsl()!.h}, ${hsl()!.s}%, ${hsl()!.l}%` : "N/A"}</code>
            </div>
        </div>
        <hr/>
        <div class={"flex flex-col gap-2"}>
            <div class="flex flex-row justify-between">
                <span>Text</span>
                <code>{bestContrast()}</code>
            </div>
            <div class="flex flex-row justify-between items-center">
                <div class={"flex flex-col"}>
                    <span>Contrast</span>
                    <span class="labelLg">{contrastRatio().toFixed(2)}:1 ratio</span>
                </div>

                <div>
                    <ul class="chips flex flex-row gap-2">
                        <li class={largeTextClass()}>AA</li>
                        <li class={smallTextClass()}>AAA</li>
                    </ul>
                </div>
            </div>

        </div>
    </article>
}
