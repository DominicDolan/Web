import {useThemeStore} from "~/app/themes/ThemeEditor/ThemeEditor";
import {useNavigate} from "@solidjs/router";


export default function AddThemeButton() {
    const { pushThemeDelta } = useThemeStore()
    const navigate = useNavigate()
    function addTheme() {
        const theme = pushThemeDelta("create", {
            name: "New Theme",
        })

        navigate(`/editor/${theme.id}`)
    }

    return  <button onClick={addTheme} flex={"row gap-2 center"}><i>add</i><span>Add Theme</span></button>
}
