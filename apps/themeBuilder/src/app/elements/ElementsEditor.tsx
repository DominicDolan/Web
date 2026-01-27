import {A, useNavigate} from "@solidjs/router";
import NavBarTemplate from "~/app/common/NavBarTemplate";


export default function ElementsEditor(props: { children?: any}) {

    const navigate = useNavigate()
    function goBack() {
        navigate(-1)
    }

    return <div grid-cols={"[20rem,1fr]"} sizing={"h-full"}>
        <NavBarTemplate
            prepend={<button class={"icon flat surface"} sizing={"w-2.5rem h-2.5rem"} spacing={"ma-0.5rem"}
                             flex={"row center justify-center"} onClick={goBack}>
                <i>arrow_back</i>
            </button>}>

            <section spacing={"ml-0.75rem"} flex={"col gap-3"}>
                <h2>Elements Editor</h2>
                <ul class={"nav"} flex={"col gap-1"}>
                    <li>
                        <A href={"inputs"}>Inputs</A>
                    </li>
                    <li>
                        <A href={"buttons"}>Buttons</A>
                    </li>
                </ul>
            </section>
        </NavBarTemplate>
        {props.children}
    </div>
}
