import {Accessor, type JSX} from "solid-js";
import {ButtonRowField} from "~/app/typography/TypefaceEditor/TypefacePropertyButtonGroup";

export type TextPropertyKey =
    | "font-family"
    | "font-size"
    | "font-weight"
    | "line-height"
    | "letter-spacing"
    | "font-style"
    | "text-transform"
    | "text-decoration"
    | "text-align";

type PropertyConfig = {
    key: TextPropertyKey;
    component: (props: {onInput: (value: string) => void, value: Accessor<string> }) => JSX.Element;
};

export const propertyFields: PropertyConfig[] = [
    {
        key: "font-family",
        component({onInput, value}) {
            return <form-field class="flex flex-col gap-2">
                <label for="fontFamily">Font Family</label>
                <input-shell class="flex gap-2 h-full p-2">
                    <input
                        id="fontFamily"
                        type="text"
                        placeholder="Roboto Flex, sans-serif"
                        value={value()}
                        onInput={(event) => onInput(event.currentTarget.value)}/>
                </input-shell>
            </form-field>
        }
    },
    {
        key: "font-size",
        component({onInput, value}) {
            return <form-field class="flex flex-col gap-2">
                <label for="fontSize">Font Size</label>
                <input-shell class="flex gap-2 h-full p-2">
                    <input
                        id="fontSize"
                        type="text"
                        placeholder="16px"
                        value={value()}
                        onInput={(event) => onInput(event.currentTarget.value)}/>
                </input-shell>
            </form-field>
        }
    },
    {
        key: "font-weight",
        component({onInput, value}) {
            return <form-field class="flex flex-col gap-2">
                <label for="fontWeight">Font Weight</label>
                <input-shell class="flex gap-4 items-center h-full p-2">
                    <input
                        id="fontWeight"
                        type="range"
                        placeholder="400"
                        value={value()}
                        min={100}
                        max={900}
                        step={100}
                        onInput={(event) => onInput(event.currentTarget.value)}/>
                    <span>{value()}</span>
                </input-shell>
            </form-field>
        }
    },
    {
        key: "line-height",
        component({onInput, value}) {
            return <form-field class="flex flex-col gap-2">
                <label for="lineHeight">Line Height</label>
                <input-shell class="flex gap-2 h-full p-2">
                    <input
                        id="lineHeight"
                        type="text"
                        placeholder="1.5"
                        value={value()}
                        onInput={(event) => onInput(event.currentTarget.value)}/>
                </input-shell>
            </form-field>
        }
    },
    {
        key: "letter-spacing",
        component({onInput, value}) {
            return <form-field class="flex flex-col gap-2">
                <label for="letterSpacing">Letter Spacing</label>
                <input-shell class="flex gap-2 h-full p-2">
                    <input
                        id="letterSpacing"
                        type="text"
                        placeholder="0.15px"
                        value={value()}
                        onInput={(event) => onInput(event.currentTarget.value)}/>
                </input-shell>
            </form-field>
        }
    },
    {
        key: "font-style",
        component({onInput, value}) {
            return <ButtonRowField
                id="fontStyle"
                label="Font Style"
                onInput={onInput}
                value={value}
                options={[
                    {label: "Default", value: "", icon: "format_clear"},
                    {label: "Normal", value: "normal", preview: <span class="text-sm leading-none">N</span>},
                    {label: "Italic", value: "italic", icon: "format_italic"},
                    {label: "Oblique", value: "oblique", preview: <span class="text-sm leading-none" style={{"font-style": "oblique"}}>O</span>},
                ]}/>
        }
    },
    {
        key: "text-transform",
        component({onInput, value}) {
            return <ButtonRowField
                id="textTransform"
                label="Text Transform"
                onInput={onInput}
                value={value}
                options={[
                    {label: "Default", value: "", icon: "format_clear"},
                    {label: "None", value: "none", preview: <span class="text-sm leading-none">aB</span>},
                    {label: "Uppercase", value: "uppercase", preview: <span class="text-sm leading-none">AB</span>},
                    {label: "Lowercase", value: "lowercase", preview: <span class="text-sm leading-none">ab</span>},
                    {label: "Capitalize", value: "capitalize", preview: <span class="text-sm leading-none">Ab</span>},
                ]}/>
        },
    },
    {
        key: "text-decoration",
        component({onInput, value}) {
            return <ButtonRowField
                id="textDecoration"
                label="Text Decoration"
                onInput={onInput}
                value={value}
                options={[
                    {label: "Default", value: "", icon: "format_clear"},
                    {label: "None", value: "none", preview: <span class="text-sm leading-none">ab</span>},
                    {label: "Underline", value: "underline", icon: "format_underlined"},
                    {label: "Overline", value: "overline", preview: <span class="text-sm leading-none" style={{"text-decoration": "overline"}}>ab</span>},
                    {label: "Line Through", value: "line-through", icon: "format_strikethrough"},
                ]}/>
        },
    },
    {
        key: "text-align",
        component({onInput, value}) {
            return <ButtonRowField
                id="textAlign"
                label="Text Align"
                onInput={onInput}
                value={value}
                options={[
                    {label: "Default", value: "", icon: "format_clear"},
                    {label: "Left", value: "left", icon: "format_align_left"},
                    {label: "Center", value: "center", icon: "format_align_center"},
                    {label: "Right", value: "right", icon: "format_align_right"},
                    {label: "Justify", value: "justify", icon: "format_align_justify"},
                ]}/>
        },
    },
];
