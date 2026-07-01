import {useColorListScope} from "~/app/colors/ColorList/ColorListScope";

export function ColorAddCard() {

    const { addColor } = useColorListScope()

    return <article class="flat min-h-40" role="button" onClick={addColor}>
        <empty-state class="empty primary h-full w-full flex items-center justify-center">
            <div class="flex flex-col items-center">
                <i class="xlarge">add</i>
                <p>Add Colors</p>
            </div>
        </empty-state>
    </article>
}
