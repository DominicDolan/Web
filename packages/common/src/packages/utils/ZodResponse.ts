import {CustomResponse, json, RouterResponseInit} from "@solidjs/router"
import {ZodSafeParseResult} from "zod"
import {SanitizedZodError, sanitizeError} from "@theme-builder/common/packages/utils/ZodSanitize"
import {Model} from "../../../../d1/src/Model";

export function zodResponse(result: ZodSafeParseResult<unknown>, init?: RouterResponseInit): CustomResponse<{ success: true, error: undefined, updatedAt: number } | { success: false, error: SanitizedZodError<unknown>, updatedAt: undefined }> {
    if (result.success) {
        return json({ success: true, error: undefined, updatedAt: (result.data as Model)?.updatedAt ?? 0 }, init)
    } else {
        return json({
            success: false,
            error: sanitizeError(result.error),
            updatedAt: undefined
        }, init)
    }
}
