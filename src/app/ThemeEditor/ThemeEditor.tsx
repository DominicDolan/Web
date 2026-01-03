import {
    A,
} from "@solidjs/router"
import NavBarTemplate from "~/app/common/NavBarTemplate";

export default function ThemeEditor(props: { children?: any}) {

    return <div grid-cols={"[14rem,20rem,1fr]"} sizing={"w-full h-full"}>
        <NavBarTemplate>
            <div sizing={"w-full"} flex={"col gap-6"}>
                <button flex={"row gap-2 center"}><i>add</i><span>Add Theme</span></button>
                <ul class="nav" flex={"col gap-4"} sizing={"w-full"} spacing={"pl-0"}>
                    <li>
                        <A href={"/theme/1"} class={"display-block"}>Theme 1</A>
                    </li>
                    <li>
                        <A href={"/theme/2"} class={"display-block"}>Theme 2</A>
                    </li>
                    <li>
                        <A href={"/"} class={"display-block"}>Home</A>
                    </li>
                </ul>
            </div>
        </NavBarTemplate>
        {props.children}
    </div>
}
