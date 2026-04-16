/**
 * Converts a camelCase string to Title Case.
 * @param str - The camelCase string to convert
 * @returns The string converted to Title Case with spaces between words
 * @example
 * camelToTitleCase("helloWorld") // returns "Hello World"
 * camelToTitleCase("xmlHttpRequest") // returns "XML Http Request"
 */
export function camelToTitleCase(str: string): string {
    if (!str) return str;

    return str
        .replace(/^[a-z]/, (firstChar) => firstChar.toUpperCase())
        .replace(/([A-Z])/g, ' $1')
        .trim();
}

