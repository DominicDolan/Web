import type {
    LinsColorRoleId,
    LinsElementCategoryId,
    LinsElementCategorySpec,
    LinsIconSizeId,
    LinsSelectorSlotSpec,
    LinsStylesheetId,
    LinsStylesheetSpec,
    LinsTypographyRoleId,
    LinsTypographyRoleSpec,
    LinsTypographyRoleVariantId,
    LinsTypographyRoleVariantSpec,
    LinsTypographySizeId,
    LinsTypographySizeSpec,
} from "./spec.ts";
import { LINS_THEME_SPEC } from "./spec.ts";

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
    /** Defaults to every stylesheet in the LINS spec. Useful while a theme is partially implemented. */
    readonly stylesheets?: readonly LinsStylesheetId[];
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
    /** Required for custom categories that are not part of the LINS spec. */
    readonly stylesheetId?: LinsStylesheetId;
    /** Required for custom categories only; LINS category selectors come from `spec.ts`. */
    readonly selectors?: readonly string[];
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
    /** Defaults to the variant id. Use only when the CSS class intentionally differs from the config key. */
    readonly className?: string;
    readonly default?: boolean;
    /** Overrides the selectors generated from `className`; values may use `&` relative to the category root. */
    readonly selectors?: readonly string[];
    /** Zero-specificity default selectors that share this variant's declarations. Values may use `&` relative to the category root. */
    readonly applyAsDefault?: readonly string[];
    /** Variant-owned contextual selectors, such as tab items or indicators inside a tab-list variant. */
    readonly contexts?: Record<string, LinsRawCssBlock>;
}

// noinspection JSUnusedGlobalSymbols
export interface LinsRawCssBlock {
    /** Optional relative selector override for states, parts, and contexts. */
    readonly selector?: string | readonly string[];
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

interface ResolvedCategoryDefinition {
    readonly id: string;
    readonly spec?: LinsElementCategorySpec;
    readonly config: LinsCategoryThemeDefinition;
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
export interface LinsDefinedTheme<TTheme extends LinsThemeDefinition> {
    readonly definition: TTheme;
    createThemeStylesheet(options?: LinsThemeBuildOptions): string;
    createStylesheet(id: LinsStylesheetId, options?: LinsThemeBuildOptions): string;
}

// noinspection JSUnusedGlobalSymbols
export function defineLinsTheme<const TTheme extends LinsThemeDefinition>(theme: TTheme): TTheme & LinsDefinedTheme<TTheme> {
    const definedTheme = theme as TTheme & LinsDefinedTheme<TTheme>;

    Object.defineProperties(definedTheme, {
        definition: {
            enumerable: false,
            value: theme,
        },
        createThemeStylesheet: {
            enumerable: false,
            value: (options?: LinsThemeBuildOptions) => createThemeStylesheet(theme, options),
        },
        createStylesheet: {
            enumerable: false,
            value: (id: LinsStylesheetId, options?: LinsThemeBuildOptions) => createStylesheet(theme, id, options),
        },
    });

    return definedTheme;
}


function createThemeStylesheet(theme: LinsThemeDefinition, options: LinsThemeBuildOptions = {}): string {
    const css: string[] = [];
    const imports = uniqueStrings([
        ...LINS_THEME_SPEC.automaticImports,
        ...getStylesheetImports(theme),
    ]);

    css.push(...imports.map((importPath) => `@import ${JSON.stringify(importPath)};`));

    if (theme.description) {
        css.push("", renderBlockComment(theme.description));
    }

    const fontFaceCss = theme.icons?.fontFaceCss?.trim();
    if (fontFaceCss) {
        css.push("", fontFaceCss);
    }

    const defaults = renderDefaultsLayer(theme, options);
    if (defaults) {
        css.push("", defaults);
    }

    return `${css.join("\n").trimEnd()}\n`;
}

function createStylesheet(theme: LinsThemeDefinition, id: LinsStylesheetId, options: LinsThemeBuildOptions = {}): string {
    const stylesheet = getStylesheet(id);
    const rules = renderStylesheetRules(theme, stylesheet, options);

    const stylesheetCss = rules.trimEnd();

    if (!stylesheetCss) {
        throw new Error(`Theme ${JSON.stringify(theme.id)} defines an empty CSS body for stylesheet ${JSON.stringify(stylesheet.id)}.`);
    }

    return `${stylesheetCss}\n`;
}

function getStylesheetImports(theme: LinsThemeDefinition): string[] {
    if (!theme.stylesheets) {
        return LINS_THEME_SPEC.stylesheets.map((stylesheet) => stylesheet.importPath);
    }

    return theme.stylesheets.map((stylesheetId) => {
        const stylesheet = getStylesheet(stylesheetId);
        return stylesheet.importPath;
    });
}

function renderStylesheetRules(theme: LinsThemeDefinition, stylesheet: LinsStylesheetSpec, options: LinsThemeBuildOptions): string {
    const scopedRules: string[] = [];
    const unscopedRules: string[] = [];
    const categories = getCategoriesForStylesheet(theme, stylesheet.id as LinsStylesheetId);

    if (stylesheet.includesTypography) {
        unscopedRules.push(...renderTypographyDefaults(theme));
        scopedRules.push(...renderTypographyRules(theme, options));
    }

    if (stylesheet.id === "icon") {
        scopedRules.push(...renderIconRules(theme, options));
    }

    for (const category of categories) {
        scopedRules.push(...renderCategoryRules(category, options));
    }

    const sections: string[] = [];

    if (unscopedRules.length > 0) {
        sections.push(renderAtRule("@layer defaults", unscopedRules.join("\n\n")));
    }

    if (scopedRules.length > 0) {
        sections.push(renderAtRule("@layer elements", renderAtRule(`@scope (${LINS_THEME_SPEC.defaultScope.rootSelector}) to (${classSelector(getOptOutClassName(theme))})`, scopedRules.join("\n\n"))));
    }

    return sections.join("\n\n");
}

function getCategoriesForStylesheet(theme: LinsThemeDefinition, stylesheetId: LinsStylesheetId): ResolvedCategoryDefinition[] {
    const categories: ResolvedCategoryDefinition[] = [];

    for (const spec of LINS_THEME_SPEC.elementCategories) {
        if (spec.stylesheetId !== stylesheetId) {
            continue;
        }

        const config = theme.categories?.[spec.id];

        if (config) {
            categories.push({ id: spec.id, spec, config });
        }
    }

    const categoryMap = (theme.categories ?? {}) as Record<string, LinsCategoryThemeDefinition | undefined>;

    for (const id of Object.keys(categoryMap)) {
        const config = categoryMap[id];

        if (!config || config.stylesheetId !== stylesheetId || LINS_THEME_SPEC.elementCategories.some((category) => category.id === id)) {
            continue;
        }

        categories.push({ id, config });
    }

    return categories;
}

function renderCategoryRules(category: ResolvedCategoryDefinition, options: LinsThemeBuildOptions): string[] {
    const selectors = category.config.selectors ?? category.spec?.selectors;

    if (!selectors?.length) {
        return [];
    }

    const body: string[] = [];
    const root = joinRawBlockParts(category.config.root?.before, category.config.root?.css, category.config.root?.after);

    if (options.includeSpecComments && category.spec?.description) {
        body.push(renderBlockComment(category.spec.description));
    }

    if (root) {
        body.push(root);
    }

    const variantMap = (category.config.variants ?? {}) as Record<string, LinsVariantThemeDefinition | undefined>;
    const variantEntries = Object.entries(variantMap).filter((entry): entry is [string, LinsVariantThemeDefinition] => Boolean(entry[1]));
    const variantClassNames = variantEntries.map(([variantId, variant]) => getVariantClassName(variantId, variant));

    for (const [variantId, variant] of variantEntries) {
        const renderedVariant = renderVariantRule(variantId, variant, options, variantClassNames);

        if (renderedVariant) {
            body.push(renderedVariant);
        }
    }

    const stateMap = (category.config.states ?? {}) as Record<string, LinsRawCssBlock | undefined>;

    for (const stateId of Object.keys(stateMap)) {
        const state = stateMap[stateId];

        if (!state) {
            continue;
        }

        const specState = findSelectorSlot(category.spec?.states, stateId);
        const renderedState = renderSlotRule(state, specState, options);

        if (renderedState) {
            body.push(renderedState);
        }
    }

    const partMap = (category.config.parts ?? {}) as Record<string, LinsRawCssBlock | undefined>;

    for (const partId of Object.keys(partMap)) {
        const part = partMap[partId];

        if (!part) {
            continue;
        }

        const specPart = findSelectorSlot(category.spec?.parts, partId);
        const renderedPart = renderSlotRule(part, specPart, options);

        if (renderedPart) {
            body.push(renderedPart);
        }
    }

    for (const rawRule of category.config.raw ?? []) {
        const renderedRawRule = renderRawRule(rawRule);

        if (renderedRawRule) {
            body.push(renderedRawRule);
        }
    }

    return body.length > 0 ? [renderCssRule(selectors, body.join("\n\n"))] : [];
}

function renderVariantRule(variantId: string, variant: LinsVariantThemeDefinition, options: LinsThemeBuildOptions = {}, siblingVariantClassNames: readonly string[] = []): string {
    const selectors = getVariantSelectors(variantId, variant, siblingVariantClassNames);
    const css = joinRawBlockParts(variant.before, variant.css, variant.after);
    const body: string[] = [];


    if (css) {
        body.push(css);
    }

    const contextMap = (variant.contexts ?? {}) as Record<string, LinsRawCssBlock | undefined>;

    for (const contextId of Object.keys(contextMap)) {
        const context = contextMap[contextId];

        if (!context) {
            continue;
        }

        const renderedContext = renderSlotRule(context, undefined, options);

        if (renderedContext) {
            body.push(renderedContext);
        }
    }

    return body.length > 0 ? renderCssRule(selectors, body.join("\n\n")) : "";
}

function getVariantSelectors(variantId: string, variant: LinsVariantThemeDefinition, siblingVariantClassNames: readonly string[] = []): string[] {
    const className = getVariantClassName(variantId, variant);
    const explicitSelectors = variant.selectors ?? [`&${classSelector(className)}`];
    const defaultSelector = variant.default ? getDefaultVariantSelector(className, siblingVariantClassNames) : undefined;
    const defaultSelectors = uniqueStrings([
        ...(defaultSelector ? [defaultSelector] : []),
        ...(variant.applyAsDefault ?? []),
    ]).map((selector) => `:where(${selector})`);

    return [...defaultSelectors, ...explicitSelectors];
}

function getVariantClassName(variantId: string, variant: LinsVariantThemeDefinition): string {
    return variant.className ?? variantId;
}

function getDefaultVariantSelector(className: string, siblingVariantClassNames: readonly string[]): string {
    const excludedVariantSelectors = uniqueStrings(siblingVariantClassNames)
        .filter((candidate) => candidate !== className)
        .map((candidate) => `:not(${classSelector(candidate)})`)
        .join("");

    return `&${excludedVariantSelectors}`;
}

function renderSlotRule(block: LinsRawCssBlock, spec?: LinsSelectorSlotSpec, options: LinsThemeBuildOptions = {}): string {
    const selectors = getBlockSelectors(block, spec?.selectors);
    const css = joinRawBlockParts(block.before, block.css, block.after);

    if (!selectors?.length || !css) {
        return "";
    }

    const body = options.includeSpecComments && spec?.description
        ? `${renderBlockComment(spec.description)}\n${css}`
        : css;

    return renderCssRule(selectors, body);
}

function findSelectorSlot(slots: readonly LinsSelectorSlotSpec[] | undefined, id: string): LinsSelectorSlotSpec | undefined {
    return slots?.find((candidate: LinsSelectorSlotSpec) => candidate.id === id);
}

function getBlockSelectors(block: LinsRawCssBlock, fallback?: readonly string[]): readonly string[] | undefined {
    if (hasSelector(block)) {
        const selector = block.selector;

        return typeof selector === "string" ? [selector] : selector;
    }

    return fallback;
}

function hasSelector(block: LinsRawCssBlock): block is LinsRawCssBlock & { readonly selector: string | readonly string[] } {
    return "selector" in block && Boolean((block as { readonly selector?: unknown }).selector);
}

function renderTypographyDefaults(theme: LinsThemeDefinition): string[] {
    const rules: string[] = [];
    const defaultsCss = theme.typography?.defaults?.css?.trim();

    if (defaultsCss) {
        rules.push(renderCssRule(":root", defaultsCss));
    }

    return rules;
}

function renderTypographyRules(theme: LinsThemeDefinition, options: LinsThemeBuildOptions): string[] {
    const rules: string[] = [];

    for (const role of LINS_THEME_SPEC.typography.roles) {
        const block = theme.typography?.roles?.[role.id];
        const rendered = block ? renderTypographyRoleRule(role, block, options) : "";

        if (rendered) {
            rules.push(rendered);
        }
    }

    for (const roleVariant of LINS_THEME_SPEC.typography.roleVariants) {
        const block = theme.typography?.roleVariants?.[roleVariant.id];
        const rendered = block ? renderTypographyRoleVariantRule(roleVariant, block, options) : "";

        if (rendered) {
            rules.push(rendered);
        }
    }

    for (const size of LINS_THEME_SPEC.typography.sizes) {
        const block = theme.typography?.sizes?.[size.id];
        const rendered = block ? renderTypographySizeRule(size, block, options) : "";

        if (rendered) {
            rules.push(rendered);
        }
    }

    for (const rawRule of theme.typography?.raw ?? []) {
        const renderedRawRule = renderRawRule(rawRule);

        if (renderedRawRule) {
            rules.push(renderedRawRule);
        }
    }

    return rules;
}

function renderTypographyRoleRule(role: LinsTypographyRoleSpec, block: LinsRawCssBlock, options: LinsThemeBuildOptions): string {
    return renderTypographyRule([whereSelector(role.defaultSelectors), classSelector(role.className)], block, role.description, options);
}

function renderTypographyRoleVariantRule(roleVariant: LinsTypographyRoleVariantSpec, block: LinsRawCssBlock, options: LinsThemeBuildOptions): string {
    return renderTypographyRule([whereSelector(roleVariant.defaultSelectors), roleVariant.selector], block, roleVariant.description, options);
}

function renderTypographySizeRule(size: LinsTypographySizeSpec, block: LinsRawCssBlock, options: LinsThemeBuildOptions): string {
    return renderTypographyRule([whereSelector(size.defaultSelectors), classSelector(size.className)], block, size.description, options);
}

function renderTypographyRule(selectors: readonly string[], block: LinsRawCssBlock, description: string, options: LinsThemeBuildOptions): string {
    const css = joinRawBlockParts(block.before, block.css, block.after);

    if (!css) {
        return "";
    }

    const body = options.includeSpecComments ? `${renderBlockComment(description)}\n${css}` : css;

    return renderCssRule(selectors, body);
}

function renderIconRules(theme: LinsThemeDefinition, _options: LinsThemeBuildOptions): string[] {
    return Object.entries(theme.icons?.sizes ?? {}).map(([sizeId, size]) => {
        const spec = LINS_THEME_SPEC.icons.sizes.find((candidate) => candidate.id === sizeId);
        const defaultSelectors = spec && "applyAsDefault" in spec ? spec.applyAsDefault : undefined;
        const selectors = uniqueStrings([
            ...(defaultSelectors ?? []).map((selector) => `:where(${selector})`),
            `i${classSelector(spec?.className ?? sizeId)}`,
        ]);

        return renderCssRule(selectors, `font-size: ${size};`);
    });
}

function whereSelector(selectors: readonly string[]): string {
    return `:where(${selectors.join(", ")})`;
}

function renderDefaultsLayer(theme: LinsThemeDefinition, options: LinsThemeBuildOptions): string {
    const rules: string[] = [];
    const themeRoot = renderThemeRootRule(theme);
    const colorSchemes = theme.colorThemes.map((colorScheme) => renderColorSchemeRule(theme, colorScheme, options));
    const colorRoleRules = renderColorRoleRules(theme);
    const appDefaults = renderAppDefaults(theme);

    if (themeRoot) {
        rules.push(themeRoot);
    }

    rules.push(...colorSchemes);
    rules.push(...colorRoleRules);

    if (appDefaults) {
        rules.push(appDefaults);
    }

    if (rules.length === 0) {
        return "";
    }

    return renderAtRule("@layer defaults", rules.join("\n\n"));
}

function renderThemeRootRule(theme: LinsThemeDefinition): string {
    const declarations: string[] = [];
    const rawBlocks: string[] = [];
    const typographyDefaultsCss = theme.typography?.defaults?.css?.trim();
    const iconCss = theme.icons?.css?.css?.trim();

    if (theme.icons?.family) {
        declarations.push(`--icon-font-family: ${theme.icons.family};`);
    }

    if (typographyDefaultsCss) {
        rawBlocks.push(typographyDefaultsCss);
    }

    if (iconCss) {
        rawBlocks.push(iconCss);
    }

    const body = [...declarations, ...rawBlocks].join("\n");

    return body ? renderCssRule(classSelector(theme.className), body) : "";
}

function renderColorSchemeRule(theme: LinsThemeDefinition, colorScheme: LinsThemeColorSchemeDefinition, options: LinsThemeBuildOptions): string {
    const declarations: string[] = [];

    if (options.includeSpecComments && colorScheme.description) {
        declarations.push(renderBlockComment(colorScheme.description));
    }

    const colorMap = colorScheme.colors as Record<string, LinsThemeColorValueDefinition | undefined>;

    for (const roleId of Object.keys(colorMap)) {
        const colorValue = colorMap[roleId];

        if (!colorValue) {
            continue;
        }

        const role = getColorRole(roleId);
        const normalized = normalizeColorValue(colorValue);

        declarations.push(`${role.cssVariable}: ${normalized.color};`);

        if (normalized.onColor) {
            declarations.push(`${role.onCssVariable}: ${normalized.onColor};`);
        }
    }

    for (const [token, value] of Object.entries(colorScheme.tokens ?? {})) {
        declarations.push(`${token}: ${value};`);
    }

    declarations.push(`color-scheme: ${colorScheme.colorScheme};`);

    return joinRawBlockParts(
        colorScheme.before,
        renderCssRule(`${classSelector(theme.className)}${classSelector(colorScheme.className)}`, declarations.join("\n")),
        colorScheme.after,
    );
}

function renderColorRoleRules(theme: LinsThemeDefinition): string[] {
    const roleIds = uniqueStrings([
        ...LINS_THEME_SPEC.colorRoles.map((role) => role.id),
        ...theme.colorThemes.flatMap((colorScheme) => Object.keys(colorScheme.colors)),
    ]);

    return roleIds.map((roleId) => {
        const role = getColorRole(roleId);

        return renderCssRule(classSelector(roleId), [
            `--active-color: var(${role.cssVariable});`,
            `--on-active-color: var(${role.onCssVariable});`,
        ].join("\n"));
    });
}

function renderAppDefaults(theme: LinsThemeDefinition): string {
    const scopedRules: string[] = [];
    const unscopedRules: string[] = [];

    for (const rule of theme.appDefaults ?? []) {
        const renderedRule = renderRawRule(rule);

        if (!renderedRule) {
            continue;
        }

        if (rule.scoped === false) {
            unscopedRules.push(renderedRule);
        } else {
            scopedRules.push(renderedRule);
        }
    }

    const output: string[] = [...unscopedRules];

    if (scopedRules.length > 0) {
        output.push(renderAtRule(`@scope (${LINS_THEME_SPEC.defaultScope.rootSelector}) to (${classSelector(getOptOutClassName(theme))})`, scopedRules.join("\n\n")));
    }

    return output.join("\n\n");
}

function renderRawRule(rule: LinsRawRuleDefinition): string {
    const css = rule.css?.trim();

    if (!css) {
        return "";
    }

    if (typeof rule.selector === "string" && rule.selector.trimStart().startsWith("@")) {
        return joinRawBlockParts(rule.before, renderAtRule(rule.selector, css), rule.after);
    }

    return joinRawBlockParts(rule.before, renderCssRule(rule.selector, css), rule.after);
}

function renderCssRule(selector: string | readonly string[], body: string): string {
    const selectorText = Array.isArray(selector) ? selector.join(",\n") : selector;

    return `${selectorText} {\n${indent(body.trim())}\n}`;
}

function renderAtRule(atRule: string, body: string): string {
    return `${atRule} {\n${indent(body.trim())}\n}`;
}

function normalizeColorValue(value: LinsThemeColorValueDefinition): { readonly color: string; readonly onColor?: string } {
    if (typeof value === "string") {
        return { color: value };
    }

    if (isColorTuple(value)) {
        return { color: value[0], onColor: value[1] };
    }

    return { color: value.color, onColor: value.onColor };
}

function isColorTuple(value: LinsThemeColorValueDefinition): value is readonly [color: string, onColor: string] {
    return Array.isArray(value);
}

function getColorRole(roleId: string): { readonly cssVariable: `--${string}`; readonly onCssVariable: `--${string}` } {
    const specRole = LINS_THEME_SPEC.colorRoles.find((role) => role.id === roleId);

    if (specRole) {
        return specRole;
    }

    const kebabRoleId = toKebabCase(roleId);

    return {
        cssVariable: `--${kebabRoleId}-color` as `--${string}`,
        onCssVariable: `--on-${kebabRoleId}-color` as `--${string}`,
    };
}

function getStylesheet(stylesheetId: string): LinsStylesheetSpec {
    const stylesheet = LINS_THEME_SPEC.stylesheets.find((candidate) => candidate.id === stylesheetId);

    if (!stylesheet) {
        throw new Error(`Unknown LINS stylesheet id: ${stylesheetId}`);
    }

    return stylesheet;
}

function getOptOutClassName(theme: LinsThemeDefinition): string {
    return theme.optOutClassName ?? `not${toPascalCase(theme.id)}`;
}

function classSelector(className: string, fallback = className): string {
    const normalizedClassName = className || fallback;

    return normalizedClassName.startsWith(".") ? normalizedClassName : `.${normalizedClassName}`;
}

function toPascalCase(value: string): string {
    return value
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
        .join("");
}

function toKebabCase(value: string): string {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}

function uniqueStrings(values: readonly string[]): string[] {
    return [...new Set(values)];
}

function renderBlockComment(text: string): string {
    return `/* ${text.replaceAll("*/", "*\\/")} */`;
}

function joinRawBlockParts(...parts: Array<string | undefined>): string {
    return parts.map((part) => part?.trim()).filter(Boolean).join("\n");
}

function indent(value: string): string {
    return value.split("\n").map((line) => line ? `    ${line}` : line).join("\n");
}


