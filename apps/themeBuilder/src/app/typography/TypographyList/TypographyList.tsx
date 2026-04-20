import {For} from "solid-js";
import {typefaceRoles} from "~/constants/TypefaceRoles";
import {TypefaceRoleItem} from "~/app/typography/TypographyList/TypefaceRoleItem";


export function TypographyList() {


    return <div class={"flex flex-col gap-8 p-8"}>
        <hgroup class={"flex flex-row gap-2 items-center justify-between"}>
            <h2>Typography</h2>
        </hgroup>
        <For each={typefaceRoles}>{(role) => <>
            <TypefaceRoleItem role={role()}/>
        </>}</For>
    </div>
}
