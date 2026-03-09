import NavBarTemplate from "~/app/common/NavBarTemplate";
import {useNavigate} from "@solidjs/router";


export default function FontsEditor() {

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
            <h2>Fonts Editor</h2>
        </NavBarTemplate>
    </div>
}
