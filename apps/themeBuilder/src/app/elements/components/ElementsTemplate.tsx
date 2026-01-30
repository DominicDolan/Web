import {useTabs} from "@web/components";
import {createSignal, For, Show} from "solid-js";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {useElementStyleStore} from "~/app/elements/repository/ElementStyleStore";

// Simple button that creates a variant with an inline editor
function CreateVariantButton(props: { onCreateVariant: (variantName: string) => void, text?: string }) {
    const [isEditing, setIsEditing] = createSignal(false)
    const [draftName, setDraftName] = createSignal("")

    let inputRef: HTMLInputElement | undefined

    function startEditing() {
        setDraftName("")
        setIsEditing(true)
        queueMicrotask(() => inputRef?.focus())
    }

    function commit(e: SubmitEvent) {
        e.preventDefault()
        const name = draftName().trim()
        if (!name) {
            setTimeout(() => {
                setIsEditing(false)
            })
            return
        }
        props.onCreateVariant(name)

        setTimeout(() => {
            setIsEditing(false)
        })
    }

    function cancel() {
        setIsEditing(false)
    }

    return (
        <div spacing="my-2">
            <Show
                when={isEditing()}
                fallback={
                    <button class={"plain"} flex={"row gap-1 center"} spacing={"px-2 py-1"} type="button" onClick={startEditing}>
                        <i>add</i>
                        <span>{props.text ?? 'Add'}</span>
                    </button>
                }
            >
                <form onsubmit={commit}>
                    <input
                        ref={el => (inputRef = el)}
                        type="text"
                        value={draftName()}
                        onInput={e => setDraftName(e.currentTarget.value)}
                        onBlur={cancel}
                        placeholder="New variant name"
                    />
                </form>
            </Show>
        </div>
    )
}


function VariantTabs(props: { styles: ElementStyleDefinition[], tabProps: (index: number) => any }) {

    const [editingIndex, setEditingIndex] = createSignal<number | null>(null)
    const [draftName, setDraftName] = createSignal("")

    const {renameVariant} = useElementStyleStore()

    let editingInputRef: HTMLInputElement | undefined

    function onNameChange(index: number, newName: string) {
        const trimmed = newName.trim()
        if (!trimmed) return

        renameVariant(props.styles[index].id, trimmed)
    }

    function startEditing(index: number) {
        setEditingIndex(index)
        setDraftName(props.styles[index].variant ?? "")
        queueMicrotask(() => editingInputRef?.focus())
    }

    function commitEdit() {
        const idx = editingIndex()
        if (idx == null) {
            setEditingIndex(null)
            return
        }
        onNameChange(idx, draftName())
        setEditingIndex(null)
    }

    function cancelEdit() {
        setEditingIndex(null)
    }

    const variants = () => props.styles.map(s => s.variant)

    return <ul flex={"row"} class={"tabs"}>
        <For each={variants()}>
            {(variant, indexAccessor) => {
                const index = indexAccessor()
                const isEditing = () => editingIndex() === index

                return (
                    <li {...props.tabProps(index)}>
                        <Show
                            when={isEditing()}
                            fallback={
                                <span onDblClick={e => {
                                        e.stopPropagation()
                                        startEditing(index)
                                    }}>{variant}</span>
                            }
                        >
                            <input
                                ref={el => (editingInputRef = el)}
                                type="text"
                                value={draftName()}
                                onClick={e => e.stopPropagation()}
                                onInput={e => setDraftName(e.currentTarget.value)}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                    if (e.key === "Enter") commitEdit()
                                    if (e.key === "Escape") {
                                        e.preventDefault()
                                        cancelEdit()
                                    }
                                }}
                            />
                        </Show>
                    </li>
                )
            }}
        </For>
    </ul>

}

export default function ElementsTemplate(props: {
    example: (style: ElementStyleDefinition) => any,
    controls: (style: ElementStyleDefinition) => any,
    styles: ElementStyleDefinition[],
    onAddVariant: (name: string) => void,
    onVariantsChange?: (variants: string[]) => void
}) {

    const {tabProps, windowProps, value, setActive} = useTabs()

    function addVariant(name: string) {
        props.onAddVariant(name)
        setTimeout(() => {
            setActive(props.styles.length - 1)
        })
    }

    const hasVariants = () => props.styles.length > 0

    return (
        <div>
            <Show
                when={hasVariants()}
                fallback={<>
                    <place-holder class={"empty"} sizing="h-15rem w-full" flex={"col center justify-center"}>
                            <p>No variants yet</p>
                            <CreateVariantButton onCreateVariant={addVariant} text={"Add Variant"}/>
                    </place-holder>
                </>}
            >
                <div>
                    <div flex={"row gap-2 center"} sizing="min-h-4rem">
                        <VariantTabs styles={props.styles} tabProps={tabProps}/>
                        <CreateVariantButton onCreateVariant={addVariant}/>
                    </div>
                    <window-group grid-cols="[1fr,1fr]" gap="4" {...windowProps}>
                        <section grid-rows={"[auto,1fr]"}>
                            <hgroup flex={"row gap-2 center"} spacing={"my-2"}><i>code</i><h4>CSS Properties</h4></hgroup>
                            {props.controls(props.styles[value()])}
                        </section>
                        <section grid-rows={"[auto,1fr]"}>
                            <hgroup flex={"row gap-2 center"} spacing={"my-2"}><i>photo_frame</i><h4>Live Preview</h4></hgroup>
                            <article class={"elementsPreview inset"} sizing={"h-full"}>
                                <div spacing={"mx-auto"} sizing={"w-fit"}>
                                    {props.example(props.styles[value()])}
                                </div>
                            </article>
                        </section>
                    </window-group>
                </div>
            </Show>
        </div>
    )
}
