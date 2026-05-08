import {useTypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope";
import {SubPageTemplate} from "~/components/SubPageTemplate";
import {useNavigate} from "@web/router";
import {createMemo, createSignal, Loading, Match, Switch, type JSX, Accessor} from "solid-js";
import {Dynamic} from "@solidjs/web";

type TextPropertyKey =
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

type ButtonOption = {
    label: string;
    value: string;
    icon?: string;
    preview?: JSX.Element;
};

const propertyOrder: TextPropertyKey[] = [
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "font-style",
    "text-transform",
    "text-decoration",
    "text-align",
];

function ButtonRowField(props: {
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
                    class={`outlined inline-flex min-w-9 items-center justify-center${isActive() ? " active" : ""}`}
                    onClick={() => props.onInput(option.value)}>
                    {option.icon ? <i>{option.icon}</i> : option.preview}
                </button>
            })}
        </div>
    </form-field>
}

const propertyFields: PropertyConfig[] = [
    {
        key: "font-family",
        component({onInput, value}) {
            return <form-field class="flex flex-col gap-2">
                <label for="fontFamily">Font Family</label>
                <input-shell class="outlined flex gap-2 h-full p-2">
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
                <input-shell class="outlined flex gap-2 h-full p-2">
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
                <input-shell class="outlined flex gap-2 h-full p-2">
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
                <input-shell class="outlined flex gap-2 h-full p-2">
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

function parseCssDeclarations(css: string) {
    return css
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce((acc, entry) => {
            const separator = entry.indexOf(":")
            if (separator === -1) return acc

            const property = entry.slice(0, separator).trim()
            const value = entry.slice(separator + 1).trim()

            if (property && value) {
                acc[property] = value
            }

            return acc
        }, {} as Record<string, string>)
}

function buildCssDeclarations(properties: Record<string, string>) {
    const lines: string[] = []

    for (const property of propertyOrder) {
        const value = properties[property]?.trim()
        if (value) {
            lines.push(`${property}: ${value};`)
        }
    }

    const extraProperties = Object.keys(properties)
        .filter((property) => !propertyOrder.includes(property as TextPropertyKey))
        .sort((a, b) => a.localeCompare(b))

    for (const property of extraProperties) {
        const value = properties[property]?.trim()
        if (value) {
            lines.push(`${property}: ${value};`)
        }
    }

    return lines.join("\n")
}

function formatSelectors(selector: string, fallback: string) {
    const selectors = selector
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)

    return selectors.length > 0 ? selectors.join(",\n") : fallback
}

function indentCss(css: string) {
    if (!css.trim()) return "  /* no properties */"
    return css
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
}

export function TypefaceEditor() {

    const {themeId, role, size, type, typeface, getCssOrDefault, updateCss} = useTypefaceScope()

    const navigate = useNavigate()
    function onBackClicked() {
        navigate(`/editor/${themeId()}/typography`)
    }

    const [activeTab, setActiveTab] = createSignal<"properties" | "code">("properties")

    const cssProperties = createMemo(() => parseCssDeclarations(getCssOrDefault()))
    const selector = createMemo(() => formatSelectors(typeface().applyAsDefault, `.${role()}-${size()}-${type()}`))
    const codeBlock = createMemo(() => `${selector()} {\n${indentCss(getCssOrDefault())}\n}`)

    function updateProperty(property: TextPropertyKey, value: string) {
        const nextProperties = {...cssProperties()}

        if (value.trim()) {
            nextProperties[property] = value.trim()
        } else {
            delete nextProperties[property]
        }

        updateCss(buildCssDeclarations(nextProperties), true)
    }

    return <div>
        <SubPageTemplate onBackClicked={onBackClicked} title={`Edit Typeface`} backButtonText={"Back to Typography"} >
            <Loading>
                <div class="grid grid-cols-[1fr_1fr] gap-8 mx-8">
                    <article class="col-span-full">
                        <h3 class="headline variant">Live Preview</h3>
                        <article class="inset flex flex-col gap-4 p-4 m-4">
                            <div style={getCssOrDefault()}>The Quick Brown Fox Jumped Over the Lazy Dog</div>
                            <div style={getCssOrDefault()}>0123456789 !?&amp;@</div>
                        </article>
                    </article>
                    <article>
                        <hgroup class="flex flex-row justify-between items-center">
                            <h3 class="headline variant">Font Properties</h3>
                            <ul role="tablist" class="inset">
                               <li class={{ active: activeTab() === "properties" }} onClick={() => setActiveTab("properties")}>Properties</li>
                               <li class={{ active: activeTab() === "code" }} onClick={() => setActiveTab("code")}>Code</li>
                            </ul>
                        </hgroup>
                        <div>
                            <Switch>
                                <Match when={activeTab() === "properties"}>
                                    <div class="grid grid-cols-[1fr_1fr] gap-4 px-4 py-6">
                                        {propertyFields.map((field) => (<div>
                                                <Dynamic
                                                    component={field.component}
                                                    onInput={(value: string) => updateProperty(field.key, value)}
                                                    value={() => cssProperties()[field.key] ?? ""}/>
                                            </div>
                                        ))}
                                    </div>
                                </Match>
                                <Match when={activeTab() === "code"}>
                                    <pre class="inset px-4 py-6 whitespace-pre-wrap overflow-auto">{codeBlock()}</pre>
                                </Match>
                            </Switch>
                        </div>
                    </article>
                    <article>
                        <h3 class="headline variant">Apply as Default</h3>
                        <div class="inset px-4 py-6 whitespace-pre-wrap">{selector()}</div>
                    </article>
                </div>
            </Loading>
        </SubPageTemplate>
    </div>
}
