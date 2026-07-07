/**
 * Removes the shared leading indentation from a multiline string.
 *
 * Leading and trailing blank lines are removed first, so template literals can be
 * written on their own indented lines without changing the resulting string.
 */
export function trimIndent(value: string): string {
    const lines = value.replace(/\r\n?/g, "\n").split("\n");

    while (lines.length > 0 && lines[0]!.trim() === "") {
        lines.shift();
    }

    while (lines.length > 0 && lines[lines.length - 1]!.trim() === "") {
        lines.pop();
    }

    const indent = lines.reduce<number | undefined>((currentIndent, line) => {
        if (line.trim() === "") return currentIndent;

        const lineIndent = line.match(/^[\t ]*/)![0]!.length;
        return currentIndent === undefined ? lineIndent : Math.min(currentIndent, lineIndent);
    }, undefined) ?? 0;

    return lines.map((line) => line.slice(indent)).join("\n");
}

/**
 * Tagged-template form of {@link trimIndent}.
 */
//noinspection JSUnusedGlobalSymbols
export function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
    const value = strings.reduce((result, part, index) => {
        return `${result}${part}${index < values.length ? String(values[index]) : ""}`;
    }, "");

    return trimIndent(value);
}

