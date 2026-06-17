import {SubPageTemplate} from "~/components/SubPageTemplate.tsx";
import {createMemo, createSignal, For, Loading, Show} from "solid-js";
import {useNavigate} from "@web/router";
import {useElementEditorScope} from "~/app/elements/ElementEditor/ElementEditorScope.ts";
import {ElementVariantDefinition} from "~/models/ElementVariantDefinition.ts";
import {ElementVariantEditor} from "~/app/elements/ElementEditor/ElementVariantEditor.tsx";


export function ElementEditor() {

    const {themeId, elementName, elementType, elementVariants, createNewVariant} = useElementEditorScope()

    const navigate = useNavigate()
    function onBackClicked() {

        navigate(`/editor/${themeId()}/elements`)
    }

    const [activeVariant, setActiveVariant] = createSignal<string | null>(null)

    function renderPreview(variant: ElementVariantDefinition) {
        switch (elementType()) {
            case "input":
                return (
                    <div class="flex flex-col gap-2 w-full max-w-xs">
                        <label class="labelSm">Username</label>
                        <input class="outlined p-2 w-full" placeholder="Enter text..." />
                    </div>
                );
            case "button":
                return (
                    <div class="flex gap-2">
                        <button class="elevated">Primary</button>
                        <button class="outlined">Secondary</button>
                    </div>
                );
            case "card":
                return (
                    <div class="grid grid-cols-1">
                        <article class="tonal col-start-1 row-start-1 p-4 w-70">
                            <hgroup class="flex flex-col gap-2 mb-2">
                                <h4 class="p-0">Card Title</h4>
                            </hgroup>
                            <empty-state class="skeleton">
                                <div class="h-3 w-full mb-1" />
                                <div class="h-3 w-2/3 mb-1" />
                                <div class="h-3 w-full mb-1" />
                            </empty-state>
                        </article>
                        <article class="elevated col-start-1 row-start-1 p-4 w-70">
                            <hgroup class="flex flex-col gap-2 mb-2">
                                <h4 class="p-0">Card Title</h4>
                            </hgroup>
                            <empty-state class="skeleton">
                                <div class="h-3 w-full mb-1" />
                                <div class="h-3 w-2/3 mb-1" />
                                <div class="h-3 w-full mb-1" />
                            </empty-state>
                        </article>
                    </div>
                );
            case "list":
                return (
                    <empty-state class="skeleton flex flex-col gap-1 w-48">
                        <div class="outlined p-2 flex items-center gap-2">
                            <div class="h-2 w-2" />
                            <div class="h-2 w-full" />
                        </div>
                        <div class="outlined p-2 flex items-center gap-2">
                            <div class="h-2 w-2" />
                            <div class="h-2 w-full" />
                        </div>
                    </empty-state>
                );
            case "tab":
                return (
                    <ul role="tablist" class="flex gap-2 p-1 underlined w-fit rounded">
                        <li class="active flat px-3 py-1 text-xs rounded">Tab 1</li>
                        <li class="text px-3 py-1 text-xs rounded">Tab 2</li>
                        <li class="text px-3 py-1 text-xs rounded">Tab 3</li>
                    </ul>
                );
            default:
                return null;
        }
    }

    const activeElementVariant = createMemo(() => {
        if (activeVariant() == null) {
            return undefined
        }
        return elementVariants.find(variant => variant.name === activeVariant());
    })

    const [dialogEl, setDialogEl] = createSignal<HTMLDialogElement | null>(null)
    function onAddNewVariantClicked() {
        dialogEl()?.showModal()
    }

    function onAddNewVariantSubmitted(e: Event) {
        const form = e.target as HTMLFormElement
        const formData = new FormData(form)
        const name = (formData.get("name") as string).trim()
        if (name) {
            createNewVariant(name).then(() => {
                setActiveVariant(name)
            })
            dialogEl()?.close()
            form.reset()
        }
    }

    return <Loading>
        <SubPageTemplate onBackClicked={onBackClicked} title={`Edit ${elementName()}`} backButtonText={"Back to Palette"} >
            <Loading fallback={<empty-state class="skeleton p-10 flex gap-4" aria-busy>
                <div class="grow h-full flex flex-col gap-4">
                    <div class="w-50 h-4"></div>
                    <div class="grow w-full items-center justify-center">
                        <div class="w-40 h-10"></div>
                    </div>
                    <div class="w-50 h-4"></div>
                    <div class="grow w-full items-center justify-center">
                        <div class="w-40 h-10"></div>
                    </div>
                </div>
                <div class="grow"></div>
            </empty-state>}>
                {() => {
                    if (elementVariants.length > 0) {
                        setTimeout(() => {
                            setActiveVariant(elementVariants[0].name)
                        })
                    }
                }}
                <Show when={activeElementVariant()} fallback={<empty-state class="empty primary mx-6 h-full flex items-center justify-center">No Variants Yet</empty-state>}>{(variant) => {
                    return <ElementVariantEditor variant={variant()} preview={renderPreview(variant())}></ElementVariantEditor>
                }}</Show>
                <div class="mx-8 mb-6 h-full flex flex-col gap-8">
                    <div class="flex gap-16">
                        <div class="flex gap-4 h-auto grow">
                            <For each={elementVariants}>{(variant) => {
                                // @ts-expect-error
                                return <article role="button"
                                                aria-selected={String(variant.name === activeElementVariant()?.name)}
                                                class="elevated flex flex-col min-h-60 aspect-square"
                                                onClick={() => setActiveVariant(variant.name)}>
                                    <h4 class="title variant">{variant.name}</h4>
                                    <div class="flex flex-col grow items-center justify-center w-full">
                                        {renderPreview(variant)}
                                    </div>
                                </article>;
                            }}</For>
                            <article role="button" aria-selected="false" class="text p-0 m-0 min-h-60 aspect-square" onClick={onAddNewVariantClicked}>
                                <empty-state class="empty primary p-0 m-0 flex items-center justify-center min-h-60 aspect-square">
                                    <div class="flex flex-col items-center gap-2" role="button">
                                        <div><i>add</i></div>
                                        <div>Add New Variant</div>
                                    </div>
                                </empty-state>
                            </article>
                        </div>
                    </div>
                </div>
            </Loading>
        </SubPageTemplate>
        <dialog id="new-variant-editor" ref={setDialogEl} class="w-full h-full">
            <div class="flex flex-col items-center justify-center w-full h-full">
                <article class="flex flex-col gap-4 p-4 w-1/3 max-w-200 min-w-75">
                    <h2>New Variant Name</h2>
                    <form class="flex flex-col gap-2" onSubmit={onAddNewVariantSubmitted} method="dialog">
                        <input type="text" name="name" class="outlined p-2 my-4" placeholder="Enter variant name..." />
                        <div class="flex gap-2">
                            <input type="submit" name="name" class="elevated">Create</input>
                            <button class="outlined" onClick={(e) => {
                                e.preventDefault(); dialogEl()?.close()
                            }}>Cancel</button>
                        </div>
                    </form>
                </article>
            </div>
        </dialog>
    </Loading>
}
