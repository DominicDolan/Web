import {useTypefaceScope} from "~/app/typography/TypefaceEditor/TypefaceScope";
import {SubPageTemplate} from "~/components/SubPageTemplate";
import {useNavigate} from "@web/router";
import {createMemo, createSignal, Loading, Match, Switch, type JSX} from "solid-js";

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
    id: string;
    label: string;
    placeholder?: string;
    type?: JSX.InputHTMLAttributes<HTMLInputElement>["type"];
    options?: {label: string, value: string}[];
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

const propertyFields: PropertyConfig[] = [
    {
        key: "font-family",
        id: "fontFamily",
        label: "Font Family",
        placeholder: "\"Roboto Flex\", sans-serif",
    },
    {
        key: "font-size",
        id: "fontSize",
        label: "Font Size",
        placeholder: "16px",
    },
    {
        key: "font-weight",
        id: "fontWeight",
        label: "Font Weight",
        placeholder: "400",
    },
    {
        key: "line-height",
        id: "lineHeight",
        label: "Line Height",
        placeholder: "24px",
    },
    {
        key: "letter-spacing",
        id: "letterSpacing",
        label: "Letter Spacing",
        placeholder: "0.15px",
    },
    {
        key: "font-style",
        id: "fontStyle",
        label: "Font Style",
        options: [
            {label: "Default", value: ""},
            {label: "Normal", value: "normal"},
            {label: "Italic", value: "italic"},
            {label: "Oblique", value: "oblique"},
        ],
    },
    {
        key: "text-transform",
        id: "textTransform",
        label: "Text Transform",
        options: [
            {label: "Default", value: ""},
            {label: "None", value: "none"},
            {label: "Uppercase", value: "uppercase"},
            {label: "Lowercase", value: "lowercase"},
            {label: "Capitalize", value: "capitalize"},
        ],
    },
    {
        key: "text-decoration",
        id: "textDecoration",
        label: "Text Decoration",
        options: [
            {label: "Default", value: ""},
            {label: "None", value: "none"},
            {label: "Underline", value: "underline"},
            {label: "Overline", value: "overline"},
            {label: "Line Through", value: "line-through"},
        ],
    },
    {
        key: "text-align",
        id: "textAlign",
        label: "Text Align",
        options: [
            {label: "Default", value: ""},
            {label: "Left", value: "left"},
            {label: "Center", value: "center"},
            {label: "Right", value: "right"},
            {label: "Justify", value: "justify"},
        ],
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
                                        {propertyFields.map((field) => (
                                            <form-field class="flex flex-col gap-2">
                                                <label for={field.id}>{field.label}</label>
                                                {field.options ? (
                                                    <select
                                                        id={field.id}
                                                        value={cssProperties()[field.key] ?? ""}
                                                        onInput={(event) => updateProperty(field.key, event.currentTarget.value)}>
                                                        {field.options.map((option) => (
                                                            <option value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        id={field.id}
                                                        type={field.type ?? "text"}
                                                        value={cssProperties()[field.key] ?? ""}
                                                        placeholder={field.placeholder}
                                                        onInput={(event) => updateProperty(field.key, event.currentTarget.value)}/>
                                                )}
                                            </form-field>
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
