import {ColorEditCard} from "~/app/themes/ColorEditor/ColorEditCard";

export default function ColorEditor(props: {}) {

    return <div class={"flex flex-col gap-8 p-8"}>
        <h2>Color Palette</h2>
        <div class={"grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6"}>
            <ColorEditCard name="Primary" color="#FFAAAA" />
            <ColorEditCard name="Secondary" color="#000000" />
            <ColorEditCard name="Accent" color="#000000" />
            <ColorEditCard name="Surface" color="#000000" />
            <article class="tonal">
                <empty-state class="h-full w-full flex items-center justify-center">
                    <div class="flex flex-col items-center">
                        <i class="xlarge">add</i>
                        <p>Add Colors</p>
                    </div>
                </empty-state>
            </article>
        </div>
    </div>
}
