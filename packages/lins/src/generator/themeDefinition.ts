import type {
    LinsColorRoleId,
    LinsElementCategoryId,
    LinsIconSizeId,
    LinsTypographyRoleId,
    LinsTypographyRoleVariantId,
    LinsTypographySizeId,
} from "./spec.ts";

// noinspection JSUnusedGlobalSymbols
export type LinsThemeGenerationMode = "production" | "scaffold";
export type LinsColorScheme = "light" | "dark";

// noinspection JSUnusedGlobalSymbols
export interface LinsThemeDefinition {
    readonly id: string;
    readonly name: string;
    readonly className: string;
    /** Defaults to `not${PascalCase(id)}` when omitted. */
    readonly optOutClassName?: string;
    readonly description?: string;
    readonly colorThemes: readonly LinsThemeColorSchemeDefinition[];
    readonly icons?: LinsThemeIconDefinition;
    readonly typography?: LinsThemeTypographyDefinition;
    readonly categories?: Partial<Record<LinsElementCategoryId | string, LinsCategoryThemeDefinition>>;
    /** Optional app/demo hooks. Core reset.css and base.css imports are always added by the generator. */
    readonly appDefaults?: readonly LinsRawRuleDefinition[];
}

// noinspection JSUnusedGlobalSymbols
export interface LinsThemeColorSchemeDefinition {
    readonly id: string;
    readonly name?: string;
    readonly className: string;
    readonly colorScheme: LinsColorScheme;
    readonly description?: string;
    readonly colors: Partial<Record<LinsColorRoleId | string, LinsThemeColorValueDefinition>>;
    /** Extra palette-wide tokens such as --shadow-color. */
    readonly tokens?: LinsCssTokenRecord;
    readonly before?: string;
    readonly after?: string;
}

// noinspection JSUnusedGlobalSymbols
export type LinsThemeColorValueDefinition =
    | string
    | readonly [color: string, onColor: string]
    | {
        readonly color: string;
        readonly onColor: string;
    };

// noinspection JSUnusedGlobalSymbols
export type LinsCssTokenRecord = Readonly<Record<`--${string}`, string>>;

// noinspection JSUnusedGlobalSymbols
export interface LinsThemeIconDefinition {
    readonly family?: string;
    readonly fontFaceCss?: string;
    readonly sizes?: Partial<Record<LinsIconSizeId | string, string>>;
    readonly css?: LinsRawCssBlock;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsThemeTypographyDefinition {
    /** Raw declarations inserted in @layer defaults under :root. */
    readonly defaults?: LinsRawCssBlock;
    readonly roles?: Partial<Record<LinsTypographyRoleId | string, LinsRawCssBlock>>;
    readonly roleVariants?: Partial<Record<LinsTypographyRoleVariantId | string, LinsRawCssBlock>>;
    readonly sizes?: Partial<Record<LinsTypographySizeId | string, LinsRawCssBlock>>;
    /** Escape hatch for additional text.css rules that still belong to the generated LINS theme. */
    readonly raw?: readonly LinsRawRuleDefinition[];
}

// noinspection JSUnusedGlobalSymbols
export interface LinsCategoryThemeDefinition {
    /** Raw declarations inserted into the generated category root rule. */
    readonly root?: LinsRawCssBlock;
    readonly variants?: Record<string, LinsVariantThemeDefinition>;
    readonly states?: Record<string, LinsRawCssBlock>;
    /** Non-variant sub-parts or related selectors emitted for this category. */
    readonly parts?: Record<string, LinsRawCssBlock>;
    /** Escape hatch for additional rules in this category's stylesheet and scope. */
    readonly raw?: readonly LinsRawRuleDefinition[];
}

// noinspection JSUnusedGlobalSymbols
export interface LinsVariantThemeDefinition extends LinsRawCssBlock {
    /** Variant-owned contextual selectors, such as tab items or indicators inside a tab-list variant. */
    readonly contexts?: Record<string, LinsRawCssBlock>;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsRawCssBlock {
    /** Emitted immediately before the generated rule or declaration block; useful for comments and LLM prompts. */
    readonly before?: string;
    /** Raw CSS declarations and/or nested CSS inserted inside the generated selector block. */
    readonly css?: string;
    /** Emitted immediately after the generated rule or declaration block. */
    readonly after?: string;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsRawRuleDefinition extends LinsRawCssBlock {
    readonly selector: string | readonly string[];
    /** Defaults to true. When false, the rule is emitted outside the generated @scope block. */
    readonly scoped?: boolean;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsThemeBuildOptions {
    readonly mode?: LinsThemeGenerationMode;
    /** Defaults to false; useful for generated files intended for review or LLM completion. */
    readonly includeSpecComments?: boolean;
    /** Defaults to true in scaffold mode and false in production mode. */
    readonly emitEmptyScaffoldRules?: boolean;
}

// noinspection JSUnusedGlobalSymbols
export function defineLinsTheme<const TTheme extends LinsThemeDefinition>(theme: TTheme): TTheme {
    return theme;
}


