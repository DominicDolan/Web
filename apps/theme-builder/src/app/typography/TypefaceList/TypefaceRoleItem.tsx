import {TypefaceRole, TypefaceSize, typefaceSizes} from "~/constants/TypefaceRoles";
import {camelToTitleCase} from "@web/utils/StringCasing.js";
import {createSignal, For} from "solid-js";
import {useNavigate} from "@web/router";
import {useTypefaceListScope} from "~/app/typography/TypefaceList/TypefaceListScope";
import {getTypefaceSelector} from "~/app/typography/TypographyUtils";

export function TypefaceRoleItem(props: {role: TypefaceRole}) {

    const {theme, getCssOrDefault} = useTypefaceListScope()
    const navigate = useNavigate()
    function onTypefaceClicked(variant: "default" | "variant") {
        navigate(`/editor/${theme().id}/typography/${props.role}/${variant}`)
    }

    return <section class="flex flex-col gap-8 mt-4">
        <hgroup class="flex flex-row gap-4 items-center">
            <h3>{camelToTitleCase(props.role)}</h3>
            <hr class="grow h-0.5"/>
        </hgroup>
        <div class="grid grid-cols-2 gap-8">
            <For each={["default", "variant"] as const}>
                {(variant) => <>
                    <article class="flat flex flex-col gap-4" role="button" onClick={() => onTypefaceClicked(variant)}>
                        <hgroup class="flex flex-row justify-between gap-2">
                            {camelToTitleCase(variant)}
                            <code>{getTypefaceSelector(props.role, "medium", variant)}</code>
                        </hgroup>
                        <article class="inset flex flex-col gap-2" style={getCssOrDefault(props.role, variant, "medium")}>
                            {camelToTitleCase(props.role) + " Text"}
                        </article>
                    </article>
                </>}
            </For>
        </div>
    </section>
}
