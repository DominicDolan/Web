import type { LinsStylesheetId } from "../generator/spec.ts";
import type { LinsThemeDefinition } from "../generator/themeDefinition.ts";

// noinspection JSUnusedGlobalSymbols
export type LinsStylesheetParseWarningCode =
    | "unknown-at-rule"
    | "unknown-layer"
    | "unknown-scope"
    | "unknown-selector"
    | "unsupported-declaration"
    | "malformed-rule";

// noinspection JSUnusedGlobalSymbols
export interface LinsStylesheetParseWarning {
    readonly code: LinsStylesheetParseWarningCode;
    readonly message: string;
    readonly selector?: string;
    readonly atRule?: string;
    readonly css?: string;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsStylesheetParseOptions {
    /** Identifies a generated element stylesheet. Omit when parsing the root theme stylesheet. */
    readonly stylesheetId?: LinsStylesheetId;
    /** CSS source label used in diagnostics. */
    readonly sourceId?: string;
    /** Metadata that cannot be losslessly inferred from CSS selectors alone. */
    readonly theme?: Pick<LinsThemeDefinition, "id" | "name" | "className" | "optOutClassName" | "description" | "stylesheets">;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsParsedStylesheet {
    readonly definition: Partial<LinsThemeDefinition>;
    readonly warnings: readonly LinsStylesheetParseWarning[];
}

// noinspection JSUnusedGlobalSymbols
export function parseLinsStylesheet(_css: string, _options: LinsStylesheetParseOptions = {}): LinsParsedStylesheet {
    return {
        definition: {},
        warnings: [],
    };
}

