import NavBarTemplate from "~/app/common/NavBarTemplate";
import {createMemo, For, Loading, Show} from "solid-js";
import {A, useLocation} from "@web/router";
import ThemeSettings from "~/app/themes/ThemeEditor/ThemeSettings";
import {ThemeScope} from "~/app/themes/ThemeEditor/ThemeScope";
import {useThemesListScope} from "~/app/themes/ThemeEditor/ThemesListScope";

export default function ThemeEditor() {

    const location = useLocation()
    const {themes, addNewTheme} = useThemesListScope()

    const themeId = createMemo(() => location.segments()[1])

    const selectedTheme = createMemo(() => {
        if (themeId() == null) return undefined
        return themes.find(theme => theme.id === themeId())
    })

    return <Loading fallback={<div>Loading...</div>}>
        <div class={"grid grid-cols-[14rem_20rem_1fr] w-full h-full"}>
            <NavBarTemplate class={"themeEditor"}>
                <div class={"w-full flex flex-col gap-6"}>
                    <button onClick={() => addNewTheme()} class="flex flex-row gap-2 items-center"><i>add</i><span>Add Theme</span></button>
                    <ul class="nav flex flex-col gap-4 w-full pl-0">
                        <For each={themes}>
                            {(theme) => <li>
                                <A href={`/editor/${theme().id}`} class={"block"}>{theme().name}</A>
                            </li>}
                        </For>
                    </ul>
                </div>
            </NavBarTemplate>
            <Show when={selectedTheme() != null}>
                <ThemeScope theme={selectedTheme()!}>
                    <ThemeSettings theme={selectedTheme()!}></ThemeSettings>
                </ThemeScope>
            </Show>
        </div>
    </Loading>
}
