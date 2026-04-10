

export function useColorNameUtils() {
    function variableNameToTitle(name: string) {
        return name
            .replace("--", "")
            .replace(/-/g, " ")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
    }

    return { variableNameToTitle }
}
