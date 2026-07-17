import {ColorTokenCard} from "~/app/colors/ColorList/ColorTokenCard.tsx";
import {ColorAddCard} from "~/app/colors/ColorList/ColorAddCard";
import {useColorListScope} from "~/app/colors/ColorList/ColorListScope";
import {createSignal, For, Loading} from "solid-js";
import {ColorTokenDefinition} from "~/models/ColorTokenDefinition.ts";
import {useNavigate} from "@web/router";
import {useColorNameUtils} from "~/app/colors/ColorUtils";

export default function ColorList() {
    const {
        tokens,
        theme,
        colorSchemeNames,
        addColorScheme,
        updateColorSchemeName,
        deleteColorScheme,
    } = useColorListScope()
    const navigate = useNavigate()

    function onColorClicked(color: ColorTokenDefinition) {
        navigate(`/editor/${theme().id}/colors/${color.id}`)
    }

    const [selectedToDelete, setSelectedToDelete] = createSignal<string | null>(null)

    function onDeleteColorScheme(colorScheme: string) {
        setSelectedToDelete(colorScheme)
        ;(document.getElementById("confirm-delete-dialog") as HTMLDialogElement)?.showModal();
    }

    function confirmDeleteClicked() {
        const scheme = selectedToDelete()
        if (scheme == null) return
        deleteColorScheme(scheme);
        setSelectedToDelete(null);
        (document.getElementById("confirm-delete-dialog") as HTMLDialogElement)?.close();
    }

    const {variableNameToTitle} = useColorNameUtils()
    return <div class="flex flex-col gap-8 p-8">
        <Loading fallback={<div>Loading...</div>}>
            <section class="flex flex-col gap-3">
                <article class="flat flex flex-col gap-3 p-4">
                    <header class="flex items-center justify-between gap-6">
                        <hgroup class="flex flex-col gap-1">
                            <h3 class="title medium">Colour Schemes</h3>
                            <p class="body small variant">Shared by every colour token</p>
                        </hgroup>
                        <button class="flat accent flex items-center gap-2 px-3 py-2" onClick={addColorScheme}>
                            <i class="small">add</i>
                            <span>Add scheme</span>
                        </button>
                    </header>
                    <hr class="w-full"/>
                    <ul class="flex flex-col gap-1" aria-label="Colour schemes">
                        <For each={colorSchemeNames()} fallback={
                            <li class="body small variant px-2 py-3">No colour schemes yet.</li>
                        }>{(colorScheme, index) =>
                            <li class="flex items-center gap-3 px-2 py-1">
                                <span class="label small variant w-6" aria-hidden="true">{index() + 1}</span>
                                <input-shell class="outlined flex flex-1 items-center gap-2 px-3 py-1">
                                    <i class="small variant" aria-hidden="true">palette</i>
                                    <input
                                        aria-label={`${colorScheme} colour scheme name`}
                                        type="text"
                                        value={colorScheme}
                                        onChange={event => updateColorSchemeName(colorScheme, event.currentTarget.value)}/>
                                </input-shell>
                                <button
                                    class="icon plain error p-2"
                                    onClick={() => onDeleteColorScheme(colorScheme)}
                                    aria-label={`Delete ${colorScheme} colour scheme`}
                                    title={`Delete ${colorScheme}`}>
                                    <i class="small">delete</i>
                                </button>
                            </li>
                        }</For>
                    </ul>
                </article>
            </section>
            <section class="flex flex-col gap-4">
                <h3>Colour Tokens</h3>
                <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,350px))] gap-6">
                    <For each={tokens}>{color =>
                        <ColorTokenCard
                            id={color.id}
                            className={color.cssClass}
                            name={variableNameToTitle(color.name)}
                            onClick={() => onColorClicked(color)}/>
                    }</For>
                    <ColorAddCard />
                </div>
            </section>
            <dialog id="confirm-delete-dialog" closedby="any" class="h-full w-full" popover>
                <div class="h-full w-full flex items-center justify-center">
                    <article>
                        <hgroup>
                            <h3>Delete {selectedToDelete()}</h3>
                        </hgroup>
                        <section class="p-4">
                            <p>Are you sure you want to proceed with this action? All changes will be permanent.</p>
                        </section>
                        <footer class="flex gap-2 justify-end">
                            <button class="text" onClick={() => {
                                setSelectedToDelete(null)
                                ;(document.getElementById("confirm-delete-dialog") as HTMLDialogElement)?.close();
                            }}>Cancel</button>
                            <button class="flat" onClick={() => confirmDeleteClicked()}>Confirm</button>
                        </footer>
                    </article>
                </div>
            </dialog>
        </Loading>
    </div>
}
