import {createSignal, Show} from "solid-js";


export function ApplyAsDefaultSelector(props: { selector: string, onInput: (selector: string) => void, onEnter: (selector: string) => void }) {
    const [isEditing, setIsEditing] = createSignal(false)
    const [inputRef, setInputRef] = createSignal<HTMLInputElement>()

    function startEditing() {
        setIsEditing(true)
        setTimeout(() => {
            inputRef()?.focus()
        })
    }
    return <>
        <article class="highlighted accent flex flex-row items-center" role="button" onClick={startEditing}>
            <Show when={isEditing()} fallback={props.selector == null || props.selector.length == 0 ? '\u00A0' : props.selector}>
                <input
                    ref={setInputRef}
                    class="mx-4 h-full grow"
                    type="text"
                    value={props.selector}
                    onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
                    onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                            setIsEditing(false)
                            props.onEnter((e.target as HTMLInputElement).value)
                        }
                    }} />
            </Show>
        </article>
    </>
}
