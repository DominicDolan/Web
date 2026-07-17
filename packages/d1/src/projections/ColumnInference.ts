import { z, ZodType } from "zod";

export type SqlColumnType = "TEXT" | "INTEGER" | "REAL" | "BLOB"

export function toSnakeCase(value: string) {
    return value.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()
}

/** Strips `ZodOptional`/`ZodNullable`/`ZodDefault` wrappers, tracking whether the field is nullable. */
export function unwrapZodType(zodType: any): { inner: any; nullable: boolean } {
    let nullable = false
    let current = zodType

    while (current) {
        if (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
            nullable = true
            current = current.unwrap()
        } else if (current instanceof z.ZodDefault) {
            current = current._def.innerType
        } else {
            break
        }
    }

    return { inner: current, nullable }
}

/** Infers a SQL column type from an (already-unwrapped) Zod type. Anything else is stored as JSON text. */
export function inferSqlType(zodType: any): { sqlType: SqlColumnType; isJson: boolean } {
    if (zodType instanceof z.ZodString) return { sqlType: "TEXT", isJson: false }
    if (zodType instanceof z.ZodNumber) return { sqlType: "REAL", isJson: false }
    if (zodType instanceof z.ZodBoolean) return { sqlType: "INTEGER", isJson: false }
    if (zodType instanceof z.ZodEnum) return { sqlType: "TEXT", isJson: false }

    if (zodType instanceof z.ZodLiteral) {
        const value = (zodType as any).value
        if (typeof value === "number") return { sqlType: "REAL", isJson: false }
        if (typeof value === "boolean") return { sqlType: "INTEGER", isJson: false }
        return { sqlType: "TEXT", isJson: false }
    }

    // Arrays, objects, records, unions, etc. are stored as JSON text.
    return { sqlType: "TEXT", isJson: true }
}

export function serializeColumnValue(value: unknown, isJson: boolean) {
    if (value === undefined || value === null) return null
    if (isJson && typeof value === "object") return JSON.stringify(value)
    if (typeof value === "boolean") return value ? 1 : 0
    return value
}

/**
 * Resolves the Zod type at a dot-path (e.g. `"profile.theme"`) by walking
 * `z.object(...)` shapes, unwrapping optional/nullable/default at every step.
 * Throws a descriptive error if a segment doesn't exist or an intermediate
 * segment isn't an object schema.
 */
export function resolveZodTypeAtPath(schema: ZodType<any>, path: string): { zodType: any; nullable: boolean } {
    const segments = path.split(".")
    let current: any = schema
    let nullable = false

    for (const segment of segments) {
        const { inner } = unwrapZodType(current)
        const shape: Record<string, any> | undefined = inner?.shape

        if (!shape || !(segment in shape)) {
            throw new Error(
                `Could not resolve include path "${path}": no field "${segment}" found (schema must be a z.object(...) at this point).`,
            )
        }

        current = shape[segment]
        nullable = nullable || unwrapZodType(current).nullable
    }

    return { zodType: unwrapZodType(current).inner, nullable }
}

/** Reads a dot-path (e.g. `"profile.theme"`) off a plain object, returning `undefined` for missing segments. */
export function getByPath(obj: unknown, path: string): unknown {
    if (obj === undefined || obj === null) return undefined

    return path.split(".").reduce<unknown>((acc, segment) => {
        if (acc === undefined || acc === null) return undefined
        return (acc as any)[segment]
    }, obj)
}

