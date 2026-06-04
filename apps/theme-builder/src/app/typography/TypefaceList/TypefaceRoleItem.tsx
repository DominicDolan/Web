import {TypefaceRole, TypefaceSize, typefaceSizes} from "~/constants/TypefaceRoles";
import {camelToTitleCase} from "@web/utils/StringCasing.js";
import {createSignal, For} from "solid-js";
import {useNavigate} from "@web/router";
import {useTypefaceListScope} from "~/app/typography/TypefaceList/TypefaceListScope";
import {getTypefaceSelector} from "~/app/typography/TypographyUtils";

export function TypefaceRoleItem(props: {role: TypefaceRole}) {

    const [type, setType] = createSignal<"default" | "variant">("default")

    const {theme, getCssOrDefault} = useTypefaceListScope()
    const navigate = useNavigate()
    function onTypefaceClicked(size: TypefaceSize) {
        navigate(`/editor/${theme().id}/typography/${props.role}/${size}/${type()}`)
    }

    return <section class="flex flex-col gap-8 mt-4">
        <hgroup class="flex flex-row gap-4 items-center">
            <h3>{camelToTitleCase(props.role)}</h3>
            <hr class="grow h-0.5"/>
            <ul role="tablist" class="inset flex flex-row gap-2 p-2 ml-auto">
                <li role="button" class={["py-2 px-4", { active: type() === "default" }]} onClick={() => setType("default")}>Default</li>
                <li role="button" class={["py-2 px-4", { active: type() === "variant" }]} onClick={() => setType("variant")}>Variant</li>
            </ul>
        </hgroup>
        <div class="grid grid-cols-3 gap-8">
            <For each={typefaceSizes}>
                {(size) => <>
                    <article class="flat flex flex-col gap-4" role="button" onClick={() => onTypefaceClicked(size())}>
                        <hgroup class="flex flex-row justify-between gap-2">
                            {camelToTitleCase(props.role)} {camelToTitleCase(size())}
                            <code>{getTypefaceSelector(props.role, size(), type())}</code>
                        </hgroup>
                        <article class="inset flex flex-col gap-2" style={getCssOrDefault(props.role, type(), size())}>
                            {camelToTitleCase(props.role) + " Text"}
                        </article>
                    </article>
                </>}
            </For>
        </div>
    </section>
}
