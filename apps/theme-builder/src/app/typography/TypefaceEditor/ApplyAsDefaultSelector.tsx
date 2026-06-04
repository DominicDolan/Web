import {createEffect, createSignal, Show} from "solid-js";


export function ApplyAsDefaultSelector(props: {
    selector: string,
    isEditing: boolean,
    onClick: () => void,
    onInput: (selector: string) => void,
    onEnter: (selector: string) => void,
    onDelete: () => void,
}) {
    const [inputRef, setInputRef] = createSignal<HTMLInputElement>()

    createEffect(() => props.isEditing, (newValue) => {
        if (newValue) {
            setTimeout(() => {
                inputRef()?.focus()
            })
        }
    })

    function onCardClick(e: any) {
        e.stopPropagation()
        props.onClick()
    }

    return <>
        <article class="highlighted accent flex flex-row gap-4 items-center justify-between" role="button" onClick={onCardClick}>
            <Show when={props.isEditing} fallback={props.selector == null || props.selector.length == 0 ? '\u00A0' : props.selector}>
                <input
                    ref={setInputRef}
                    class="flat h-full grow"
                    type="text"
                    value={props.selector}
                    onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
                    onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                            props.onEnter((e.target as HTMLInputElement).value)
                        }
                    }} />
            </Show>
            <button class="text inline-flex items-center p-2" onClick={props.onDelete}>
                <i>delete</i>
            </button>
        </article>
    </>
}
