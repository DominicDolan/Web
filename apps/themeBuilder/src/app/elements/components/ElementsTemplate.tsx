import {useTabs} from "@web/components";
import {createSignal, For, Show} from "solid-js";
import {ElementStyleDefinition} from "~/models/ElementStyleDefinition";
import {useElementStyleStore} from "~/app/elements/repository/ElementStyleStore";

// Simple button that creates a variant with an inline editor
function CreateVariantButton(props: { onCreateVariant: (variantName: string) => void }) {
    const [isEditing, setIsEditing] = createSignal(false)
    const [draftName, setDraftName] = createSignal("")

    let inputRef: HTMLInputElement | undefined

    function startEditing() {
        setDraftName("")
        setIsEditing(true)
        queueMicrotask(() => inputRef?.focus())
    }

    function commit() {
        console.log("commiting")
        const name = draftName().trim()
        if (!name) {
            setIsEditing(false)
            return
        }
        props.onCreateVariant(name)
        setIsEditing(false)
    }

    function cancel() {
        setIsEditing(false)
    }

    return (
        <div spacing="my-2">
            <Show
                when={isEditing()}
                fallback={
                    <button flex={"row gap-1 center"} spacing={"px-2 py-1"} type="button" onClick={startEditing}>
                        <i>add</i>
                        <span>Add Variant</span>
                    </button>
                }
            >
                <form onsubmit={commit}>
                    <input
                        ref={el => (inputRef = el)}
                        type="text"
                        value={draftName()}
                        onInput={e => setDraftName(e.currentTarget.value)}
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
        if (idx == null) return
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
    onVariantsChange?: (variants: string[]) => void
}) {

    const {tabProps, windowProps, value, setActive} = useTabs()
    const {addInputVariant} = useElementStyleStore()

    function addVariant(name: string) {
        addInputVariant(name)
        setTimeout(() => {
            setActive(props.styles.length - 1)
        })
    }

    const hasVariants = () => props.styles.length > 0

    return (
        <div sizing={"h-full"}>
            <div>
                <Show
                    when={hasVariants()}
                    fallback={
                        <CreateVariantButton onCreateVariant={addVariant}/>
                    }
                >
                    <div flex={"row gap-16 center"}>
                        <div>
                            <VariantTabs styles={props.styles} tabProps={tabProps}/>
                        </div>
                        <CreateVariantButton onCreateVariant={addVariant}/>
                    </div>
                    <window-group {...windowProps}>
                        <Show when={hasVariants()}>
                            {props.controls(props.styles[value()])}
                        </Show>
                    </window-group>
                </Show>
            </div>
            <div>
            <article class={"elementsPreview inset"}>
                    <article class={"elevated"} spacing={"mx-auto"} sizing={"w-fit"}>
                        <Show when={hasVariants()}>
                            {props.example(props.styles[value()])}
                        </Show>
                    </article>
                </article>
            </div>
        </div>
    )
}
