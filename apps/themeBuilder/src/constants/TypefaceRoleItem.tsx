import {TypefaceRole} from "~/constants/TypefaceRoles";
import {createMemo} from "solid-js";
import {camelToTitleCase} from "@web/utils/StringCasing.js"


export function TypefaceRoleItem(props: { role: TypefaceRole}) {

    const text = createMemo(() => camelToTitleCase(props.role))

    return <article class="tonal flex flex-row gap-8 justify-between">
        <hgroup class="flex flex-col gap-1">
            <code class="w-min px-2 block">.{props.role}Lg</code>
            <h2 class={`${props.role}Lg`}>{text()}</h2>
        </hgroup>
        <hgroup class="flex flex-col gap-1">
            <code class="w-min px-2 block">.{props.role}</code>
            <h2 class={`${props.role}`}>{text()}</h2>
        </hgroup>
        <hgroup class="flex flex-col gap-1">
            <code class="w-min px-2 block">.{props.role}Sm</code>
            <h2 class={`${props.role}Sm`}>{text()}</h2>
        </hgroup>
        <div>
            <button class="text">Edit &gt;</button>
        </div>
    </article>
}
