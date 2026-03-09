import Title from "~/app/common/Title";
import {Show} from "solid-js";


export default function NavBarTemplate(props: { children?: any, class?: string, prepend?: any, loading?: boolean }) {

    return <nav class={`pageNav ${props.class}`} spacing={"py-4 px-6"} flex={"col gap-8"}>
        <div flex={"row gap-2 center"}>
            {props.prepend }
            <Title/>
        </div>
        <Show when={!props.loading} fallback={
            <place-holder class={"loader"} flex={"col gap-6"}>
                { Array.from({length: 3}).map(() => <div sizing={"min-h-2rem w-full"}></div>) }
            </place-holder>
            }>
            {props.children}
        </Show>
    </nav>
}
