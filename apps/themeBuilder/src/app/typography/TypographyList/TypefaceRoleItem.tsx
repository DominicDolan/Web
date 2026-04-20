import {TypefaceRole, TypefaceSize, typefaceSizes} from "~/constants/TypefaceRoles";
import {camelToTitleCase} from "@web/utils/StringCasing.js";
import {createSignal, For} from "solid-js";
import {defaultTypefacesQueryObject} from "~/constants/DefaultTypefaces";

export function TypefaceRoleItem(props: {role: TypefaceRole}) {

    const [type, setType] = createSignal<"default" | "variant">("default")

    function getSizeSuffix(size: TypefaceSize) {
        if (size === "small") return "Sm"
        if (size === "large") return "Lg"
        return ""
    }
    return <section class="flex flex-col gap-8 mt-4">
        <hgroup class="flex flex-row gap-4 items-center">
            <h3>{camelToTitleCase(props.role)}</h3>
            <hr class="grow h-0.5"/>
            <ul role="radiogroup" class="flex flex-row gap-2 p-2 ml-auto">
                <li role="button" class={["py-2 px-4", { active: type() === "default" }]} onClick={() => setType("default")}>Default</li>
                <li role="button" class={["py-2 px-4", { active: type() === "variant" }]} onClick={() => setType("variant")}>Variant</li>
            </ul>
        </hgroup>
        <div class="grid grid-cols-3 gap-8">
            <For each={typefaceSizes}>
                {(size) => <>
                    <article class="tonal flex flex-col gap-4" role="button">
                        <hgroup class="flex flex-row justify-between gap-2">
                            {camelToTitleCase(size())}
                            <code>{props.role + getSizeSuffix(size()) + (type() === "variant" ? ".variant" : "")}</code>
                        </hgroup>
                        <article class="inset flex flex-col gap-2" style={defaultTypefacesQueryObject[props.role][type()][size()].css}>
                            {camelToTitleCase(props.role) + " Text"}
                        </article>
                    </article>
                </>}
            </For>
        </div>
    </section>
}
