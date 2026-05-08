import {TextPropertyKey} from "~/app/typography/TypefaceEditor/TypefaceFormItems";


export const propertyOrder: TextPropertyKey[] = [
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

export function parseCssDeclarations(css: string) {
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

export function buildCssDeclarations(properties: Record<string, string>) {
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

export function indentCss(css: string) {
    if (!css.trim()) return "  /* no properties */"
    return css
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")
}
