import {ZodSafeParseError, ZodSafeParseResult, ZodSafeParseSuccess} from "zod"

export type SanitizedZodError<T> = Omit<ZodSafeParseError<T>["error"], "format" | "_zod" | "flatten" | "addIssue" | "addIssues" | "isEmpty">
export type SanitizedParseZodError<T> = (Omit<ZodSafeParseError<T>, "error"> & { error: SanitizedZodError<T> })
export type SanitizedZodResult<T> = ZodSafeParseSuccess<T> | SanitizedParseZodError<T>

export function sanitizeError<T>(error: ZodSafeParseError<T>["error"]): SanitizedZodError<T> {
    return {
        issues: error.issues,
        message: error.message,
        name: error.name,
        type: error.type,
    }
}

export function sanitizeResult<T>(result: ZodSafeParseResult<T>): SanitizedZodResult<T>  {
    if (result.success) {
        return {
            data: result.data,
            success: true,
        }
    } else {
        return {
            error: sanitizeError(result.error),
            success: false
        }
    }
}

