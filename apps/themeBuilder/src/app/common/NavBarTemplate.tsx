import Title from "~/app/common/Title";
import {Show} from "solid-js";


export default function NavBarTemplate(props: { children?: any, class?: string, prepend?: any, loading?: boolean }) {

    return <nav class={`pageNav ${props.class} py-4 px-6 flex flex-col gap-8`}>
        <div class="flex flex-row gap-2 items-center">
            {props.prepend }
            <Title/>
        </div>
        <Show when={!props.loading} fallback={
            <place-holder class={"loader flex flex-col gap-6"}>
                { Array.from({length: 3}).map(() => <div class="min-h-8 w-full" ></div>) }
            </place-holder>
            }>
            {props.children}
        </Show>
    </nav>
}
