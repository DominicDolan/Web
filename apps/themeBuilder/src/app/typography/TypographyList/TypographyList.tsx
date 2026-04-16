import {createSignal, For} from "solid-js";
import {typefaceRoles} from "~/constants/TypefaceRoles";
import {TypefaceRoleItem} from "~/constants/TypefaceRoleItem";


export function TypographyList() {

    const [type, setType] = createSignal<"default" | "variant">("default")
    return <div class={"flex flex-col gap-8 p-8"}>
        <hgroup class={"flex flex-row gap-2 items-center justify-between"}>
            <h2>Typography</h2>
            <ul role="radiogroup" class="flex flex-row gap-2 p-2">
                <li role="button" class={["py-2 px-4", { active: type() === "default" }]} onClick={() => setType("default")}>Default</li>
                <li role="button" class={["py-2 px-4", { active: type() === "variant" }]} onClick={() => setType("variant")}>Variant</li>
            </ul>
        </hgroup>
        <For each={typefaceRoles}>{(role) => <TypefaceRoleItem role={role()}/>}</For>
    </div>
}
