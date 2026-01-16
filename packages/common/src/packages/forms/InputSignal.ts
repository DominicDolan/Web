import {createStore} from "solid-js/store"


export function createInputSignal() {

    const [props, setProps] = createStore({
        value: undefined as string | number | string[] | undefined,
        onInput(e: InputEvent) {
            setProps("value", (e.target as HTMLInputElement).value)
            // setValue((e.target as HTMLInputElement).value)
        }
    })

    return [
        props,
    ] as const
}