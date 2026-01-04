import {useThemeContext} from "~/app/ThemeEditor/ThemeEditor";
import {useNavigate} from "@solidjs/router";


export default function AddThemeButton() {
    const [push] = useThemeContext()
    const navigate = useNavigate()
    function addTheme() {
        const theme = push("create", {
            name: "New Theme",
        })

        navigate(`/editor/${theme.id}`)
    }

    return  <button onClick={addTheme} flex={"row gap-2 center"}><i>add</i><span>Add Theme</span></button>
}
