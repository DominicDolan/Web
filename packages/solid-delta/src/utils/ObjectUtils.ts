
export function isPlainObject(value: any): value is Record<string, any> {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

export function cloneValue<T>(value: T): T {
    if (value == null || typeof value !== "object") return value;
    return JSON.parse(JSON.stringify(value));
}
