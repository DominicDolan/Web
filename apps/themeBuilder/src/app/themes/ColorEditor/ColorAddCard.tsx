import {useColorListScope} from "~/app/themes/ColorEditor/ColorListScope";

export function ColorAddCard() {

    const { addColor } = useColorListScope()

    return <article class="tonal" role="button" onClick={addColor}>
        <empty-state class="h-full w-full flex items-center justify-center">
            <div class="flex flex-col items-center">
                <i class="xlarge">add</i>
                <p>Add Colors</p>
            </div>
        </empty-state>
    </article>
}
