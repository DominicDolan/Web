import NavBarTemplate from "~/app/common/NavBarTemplate";
import {createMemo, For, Loading} from "solid-js";
import AddThemeButton from "~/app/themes/ThemeEditor/AddThemeButton";
import {ThemeDefinition, themeDefinitionSchema} from "~/models/ThemeDefinition";
import {A} from "@web/router";
import {ModelDelta} from "@web/solid-delta";
import {getThemesMocked} from "~/app/themes/ThemeEditor/ThemeRepository";

// async function getThemes(): Promise<ModelDelta<ThemeDefinition>[]> {
//     const db = useDatabaseTable(themeDefinitionSchema)
//
//     return db.getAll()
// }

export default function ThemeEditor(props: { children?: any }) {

    const themes = createMemo(() => getThemesMocked())

    // const navigate = useNavigate()
    // const matches = useMatch(() => "/editor/:themeId?/:subroute")
    //
    // createEffect(() => themeDeltas(), (deltas) => {
    //     if (deltas != null && prevDeltas == null && Object.keys(deltas).length > 0 && (matches() == undefined || matches()?.params.themeId == null)) {
    //         const themeId = Object.keys(deltas)[0]
    //         navigate(`/editor/${themeId}`, { replace: true })
    //     }
    // })

    return <Loading fallback={<div>Loading...</div>}>
        <div grid-cols={"[14rem,20rem,1fr]"} sizing={"w-full h-full"}>
            <NavBarTemplate class={"themeEditor"}>
                <div sizing={"w-full"} flex={"col gap-6"}>
                    <AddThemeButton/>
                    <ul class="nav" flex={"col gap-4"} sizing={"w-full"} spacing={"pl-0"}>
                        <For each={themes()}>
                            {(theme) => <li>
                                <A href={`/editor/${theme().id}`} class={"display-block"}>{theme().name}</A>
                            </li>}
                        </For>
                    </ul>
                </div>
            </NavBarTemplate>
            {props.children}
        </div>
    </Loading>
}
