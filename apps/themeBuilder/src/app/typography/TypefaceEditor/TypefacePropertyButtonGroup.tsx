import {Accessor, JSX} from "solid-js";


type ButtonOption = {
    label: string;
    value: string;
    icon?: string;
    preview?: JSX.Element;
};

export function ButtonRowField(props: {
    id: string;
    label: string;
    value: Accessor<string>;
    onInput: (value: string) => void;
    options: ButtonOption[];
}) {
    return <form-field class="flex flex-col gap-2">
        <label for={props.id}>{props.label}</label>
        <div id={props.id} role="radiogroup" aria-label={props.label} class="flex flex-wrap">
            {props.options.map((option) => {
                const isActive = () => props.value() === option.value;

                return <button
                    type="button"
                    title={option.label}
                    class={`flat surface inline-flex min-w-9 items-center justify-center${isActive() ? " active" : ""}`}
                    onClick={() => props.onInput(option.value)}>
                    {option.icon ? <i>{option.icon}</i> : option.preview}
                </button>
            })}
        </div>
    </form-field>
}
