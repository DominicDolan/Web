import postcss, { type AtRule, type Declaration, type Node, type Root, type Rule } from "postcss";
import safeParse from "postcss-safe-parser";
import { LINS_THEME_SPEC, type LinsElementCategorySpec, type LinsSelectorSlotSpec, type LinsStylesheetId } from "../generator/spec.ts";
import type { LinsCategoryThemeDefinition, LinsRawCssBlock, LinsRawRuleDefinition, LinsThemeColorSchemeDefinition, LinsThemeDefinition, LinsVariantThemeDefinition } from "../generator/themeDefinition.ts";

type MutablePartialThemeDefinition = Partial<{
    -readonly [Key in keyof LinsThemeDefinition]: LinsThemeDefinition[Key];
}>;

// noinspection JSUnusedGlobalSymbols
export type LinsStylesheetParseWarningCode =
    | "unknown-at-rule"
    | "unknown-layer"
    | "unknown-scope"
    | "unknown-selector"
    | "unsupported-declaration"
    | "malformed-rule"
    | "ambiguous-category-match"
    | "ambiguous-selector-superset"
    | "partial-category-selectors"
    | "duplicate-category-definition"
    | "split-category-rule"
    | "unrecognized-category"
    | "inferred-variant-id"
    | "unnamed-variant"
    | "stale-default-exclusion"
    | "custom-part-inferred"
    | "selector-drift"
    | "partial-typography-defaults"
    | "extra-typography-defaults"
    | "unrecognized-icon-size"
    | "unsupported-icon-declaration"
    | "unrecognized-color-role"
    | "stylesheet-list-mismatch"
    | "missing-color-scheme-declaration"
    | "unrecognized-theme-root-declaration"
    | "ambiguous-theme-root-declaration"
    | "opt-out-class-mismatch"
    | "empty-rule-body";

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
    const warnings: LinsStylesheetParseWarning[] = [];
    const root = parseCss(_css, warnings);

    if (_options.stylesheetId) {
        return parseElementStylesheet(root, { ..._options, stylesheetId: _options.stylesheetId }, warnings);
    }

    return parseThemeStylesheet(root, _options, warnings);
}

function parseElementStylesheet(root: Root, options: LinsStylesheetParseOptions & { readonly stylesheetId: LinsStylesheetId }, warnings: LinsStylesheetParseWarning[]): LinsParsedStylesheet {
    const definition: MutablePartialThemeDefinition = {};
    const elementsLayers = root.nodes?.filter((node): node is AtRule => isAtRule(node, "layer") && normalizeWhitespace(node.params) === "elements") ?? [];

    for (const node of root.nodes ?? []) {
        if (isAtRule(node, "layer")) {
            const layerName = normalizeWhitespace(node.params);

            const stylesheetSpec = LINS_THEME_SPEC.stylesheets.find((stylesheet) => stylesheet.id === options.stylesheetId);

            if (layerName !== "elements" && !(layerName === "defaults" && stylesheetSpec?.includesTypography)) {
                warnings.push({
                    code: layerName === "defaults" ? "unknown-at-rule" : "unknown-layer",
                    message: `Unexpected @layer ${layerName} in element stylesheet.`,
                    atRule: atRuleHeader(node),
                });
            }
        } else if (isAnyAtRule(node)) {
            warnings.push({
                code: "unknown-at-rule",
                message: `Unexpected top-level at-rule ${atRuleHeader(node)}.`,
                atRule: atRuleHeader(node),
            });
        }
    }

    if (elementsLayers.length === 0) {
        return { definition, warnings };
    }

    for (const elementsLayer of elementsLayers) {
        const scope = elementsLayer.nodes?.find((node): node is AtRule => isAtRule(node, "scope"));
        const categoryParents = scope?.nodes ?? elementsLayer.nodes ?? [];

        if (!scope) {
            warnings.push({
                code: "unknown-scope",
                message: "Expected @layer elements to contain a generated @scope wrapper; parsing direct child rules as best effort.",
                atRule: "@layer elements",
            });
        } else {
            warnForScopeDrift(scope, options, warnings);
        }

        for (const node of categoryParents) {
            if (node.type !== "rule") {
                continue;
            }

            if (options.stylesheetId === LINS_THEME_SPEC.typography.stylesheetId && parseTypographyRule(node, definition, warnings)) {
                continue;
            }

            if (options.stylesheetId === "icon" && parseIconSizeRule(node, definition, warnings)) {
                continue;
            }

            parseCategoryRule(node, definition, options, warnings);
        }
    }

    return { definition, warnings };
}

function parseCategoryRule(rule: Rule, definition: MutablePartialThemeDefinition, options: LinsStylesheetParseOptions & { readonly stylesheetId: LinsStylesheetId }, warnings: LinsStylesheetParseWarning[]): void {
    const match = findMatchingCategory(rule.selector, options.stylesheetId);
    const spec = match.spec;
    const categoryId = spec?.id ?? slugifySelector(firstSelector(rule.selector));
    const category: MutableCategoryThemeDefinition = spec ? {} : { stylesheetId: options.stylesheetId, selectors: splitSelectorList(rule.selector) };

    if (match.warningCode) {
        warnings.push({
            code: match.warningCode,
            message: `Selector ${JSON.stringify(rule.selector)} matched ${categoryId} with drift.`,
            selector: rule.selector,
        });
    }

    if (!spec && rule.nodes?.some((node) => node.type === "rule")) {
        warnings.push({
            code: "unrecognized-category",
            message: `Captured unrecognized category-like rule ${JSON.stringify(rule.selector)} as ${JSON.stringify(categoryId)}.`,
            selector: rule.selector,
        });
    } else if (!spec && !looksLikeCustomCategory(rule)) {
        warnings.push({
            code: "unknown-selector",
            message: `Captured unknown scoped selector ${JSON.stringify(rule.selector)} as appDefaults raw CSS.`,
            selector: rule.selector,
        });
        addAppDefault(definition, { selector: rule.selector, css: stringifyContainerBody(rule) });
        return;
    }

    const rootCss: string[] = [];

    for (const child of rule.nodes ?? []) {
        if (isDeclaration(child)) {
            rootCss.push(stringifyCssNode(child));
        } else if (child.type === "rule") {
            parseCategoryChildRule(child, category, spec, warnings);
        }
    }

    if (rootCss.length === 0 && !(rule.nodes ?? []).some((node) => node.type === "rule")) {
        warnings.push({
            code: "empty-rule-body",
            message: `Rule ${JSON.stringify(rule.selector)} has no parseable declarations or nested rules.`,
            selector: rule.selector,
        });
    }

    if (rootCss.length > 0) {
        category.root = { css: rootCss.join("\n") };
    }

    const existing = definition.categories?.[categoryId];

    if (existing) {
        warnings.push({
            code: match.warningCode === "partial-category-selectors" ? "split-category-rule" : "duplicate-category-definition",
            message: `Merged multiple rules for category ${JSON.stringify(categoryId)} in file order.`,
            selector: rule.selector,
        });
    }

    definition.categories = {
        ...(definition.categories ?? {}),
        [categoryId]: mergeCategoryDefinitions(existing, category),
    };
}

function warnForScopeDrift(scope: AtRule, options: LinsStylesheetParseOptions & { readonly stylesheetId: LinsStylesheetId }, warnings: LinsStylesheetParseWarning[]): void {
    const expectedOptOut = options.theme?.optOutClassName;

    if (!expectedOptOut) {
        return;
    }

    const actualOptOut = scope.params.match(/to\s*\(\s*\.([^)\s]+)\s*\)/)?.[1];

    if (actualOptOut && actualOptOut !== expectedOptOut) {
        warnings.push({
            code: "opt-out-class-mismatch",
            message: `@scope opt-out class ${JSON.stringify(actualOptOut)} does not match theme metadata ${JSON.stringify(expectedOptOut)}.`,
            atRule: atRuleHeader(scope),
        });
    }
}

function looksLikeCustomCategory(rule: Rule): boolean {
    return !rule.selector.trim().startsWith(".");
}

function mergeCategoryDefinitions(existing: LinsCategoryThemeDefinition | undefined, incoming: MutableCategoryThemeDefinition): LinsCategoryThemeDefinition {
    return {
        ...(existing ?? {}),
        ...incoming,
        root: incoming.root ?? existing?.root,
        variants: { ...(existing?.variants ?? {}), ...(incoming.variants ?? {}) },
        states: { ...(existing?.states ?? {}), ...(incoming.states ?? {}) },
        parts: { ...(existing?.parts ?? {}), ...(incoming.parts ?? {}) },
        raw: [...(existing?.raw ?? []), ...(incoming.raw ?? [])],
    };
}

function parseTypographyRule(rule: Rule, definition: MutablePartialThemeDefinition, warnings: LinsStylesheetParseWarning[]): boolean {
    const selectors = splitSelectorList(rule.selector);
    const explicitSelectors = selectors.filter((selector) => !selector.startsWith(":where("));
    const whereSelectors = selectors.filter((selector) => selector.startsWith(":where("));
    const classNames = explicitSelectors.flatMap((selector) => [...selector.matchAll(/\.([_a-zA-Z-][_a-zA-Z0-9-]*)/g)].map((match) => match[1]!));
    const compoundClassSelector = explicitSelectors.find((selector) => /^\.[_a-zA-Z-][_a-zA-Z0-9-]*\.variant$/.test(normalizeWhitespace(selector)));
    const roleVariantSpec = compoundClassSelector ? LINS_THEME_SPEC.typography.roleVariants.find((spec) => selectorSetKey(spec.selector) === selectorSetKey(compoundClassSelector)) : undefined;
    const roleSpec = !roleVariantSpec && classNames.length === 1 ? LINS_THEME_SPEC.typography.roles.find((spec) => spec.className === classNames[0]) : undefined;
    const sizeSpec = !roleVariantSpec && !roleSpec && classNames.length === 1 ? LINS_THEME_SPEC.typography.sizes.find((spec) => spec.className === classNames[0]) : undefined;

    if (!roleVariantSpec && !roleSpec && !sizeSpec) {
        if (whereSelectors.length === 0 && explicitSelectors.length > 0) {
            definition.typography = {
                ...(definition.typography ?? {}),
                raw: [...(definition.typography?.raw ?? []), { selector: rule.selector, css: stringifyContainerBody(rule) }],
            };

            if (classNames.length > 0) {
                warnings.push({
                    code: "unknown-selector",
                    message: `Could not map typography selector ${JSON.stringify(rule.selector)} to a known role, variant, or size.`,
                    selector: rule.selector,
                });
            }

            return true;
        }

        return false;
    }

    const spec = roleVariantSpec ?? roleSpec ?? sizeSpec!;
    warnForTypographyDefaultDrift(rule, whereSelectors, spec.defaultSelectors, warnings);
    const defaultExplicitSelector = "selector" in spec ? spec.selector : `.${spec.className}`;
    const cssBlock = buildRawCssBlock(rule, explicitSelectors, defaultExplicitSelector);

    if (roleVariantSpec) {
        definition.typography = {
            ...(definition.typography ?? {}),
            roleVariants: { ...(definition.typography?.roleVariants ?? {}), [roleVariantSpec.id]: cssBlock },
        };
    } else if (roleSpec) {
        definition.typography = {
            ...(definition.typography ?? {}),
            roles: { ...(definition.typography?.roles ?? {}), [roleSpec.id]: cssBlock },
        };
    } else if (sizeSpec) {
        definition.typography = {
            ...(definition.typography ?? {}),
            sizes: { ...(definition.typography?.sizes ?? {}), [sizeSpec.id]: cssBlock },
        };
    }

    return true;
}

function warnForTypographyDefaultDrift(rule: Rule, whereSelectors: readonly string[], expectedSelectors: readonly string[], warnings: LinsStylesheetParseWarning[]): void {
    if (whereSelectors.length === 0) {
        return;
    }

    const actual = new Set(whereSelectors.flatMap((selector) => splitSelectorList(unwrapWhereSelector(selector))).map(normalizeSelectorForComparison));
    const expected = new Set(expectedSelectors.map(normalizeSelectorForComparison));
    const missing = [...expected].filter((selector) => !actual.has(selector));
    const extra = [...actual].filter((selector) => !expected.has(selector));

    if (missing.length > 0) {
        warnings.push({
            code: "partial-typography-defaults",
            message: `Typography selector ${JSON.stringify(rule.selector)} is missing default selectors: ${missing.join(", ")}.`,
            selector: rule.selector,
        });
    }

    if (extra.length > 0) {
        warnings.push({
            code: "extra-typography-defaults",
            message: `Typography selector ${JSON.stringify(rule.selector)} has extra default selectors: ${extra.join(", ")}.`,
            selector: rule.selector,
        });
    }
}

function parseIconSizeRule(rule: Rule, definition: MutablePartialThemeDefinition, warnings: LinsStylesheetParseWarning[]): boolean {
    const selectors = splitSelectorList(rule.selector);
    const explicitIconSelector = selectors.find((selector) => /^i\.[_a-zA-Z-][_a-zA-Z0-9-]*$/.test(normalizeWhitespace(selector)));

    if (!explicitIconSelector) {
        return false;
    }

    const sizeId = getLastClassName(explicitIconSelector);

    if (!sizeId) {
        return false;
    }

    const fontSize = rule.nodes?.find((node): node is Declaration => isDeclaration(node) && node.prop === "font-size");

    if (!fontSize) {
        return false;
    }

    const unsupported = (rule.nodes ?? []).filter((node) => !(isDeclaration(node) && node.prop === "font-size"));

    for (const node of unsupported) {
        warnings.push({
            code: "unsupported-icon-declaration",
            message: `Dropped unsupported declaration from icon size ${JSON.stringify(sizeId)}.`,
            selector: rule.selector,
            css: stringifyCssNode(node),
        });
    }

    if (!LINS_THEME_SPEC.icons.sizes.some((spec) => spec.id === sizeId)) {
        warnings.push({
            code: "unrecognized-icon-size",
            message: `Captured unrecognized icon size ${JSON.stringify(sizeId)}.`,
            selector: rule.selector,
        });
    }

    definition.icons = {
        ...(definition.icons ?? {}),
        sizes: { ...(definition.icons?.sizes ?? {}), [sizeId]: declarationValue(fontSize) },
    };

    return true;
}

function buildRawCssBlock(rule: Rule, explicitSelectors: readonly string[], defaultSelector: string): LinsRawCssBlock {
    const overrideSelectors = explicitSelectors.filter((selector) => selectorSetKey(selector) !== selectorSetKey(defaultSelector));

    if (overrideSelectors.length > 0) {
        return { selector: overrideSelectors.join(", "), css: stringifyDirectDeclarations(rule) };
    }

    return { css: stringifyDirectDeclarations(rule) };
}

type MutableCategoryThemeDefinition = Partial<{
    -readonly [Key in keyof LinsCategoryThemeDefinition]: LinsCategoryThemeDefinition[Key];
}>;

function parseCategoryChildRule(rule: Rule, category: MutableCategoryThemeDefinition, spec: LinsElementCategorySpec | undefined, warnings: LinsStylesheetParseWarning[]): void {
    const selectors = splitSelectorList(rule.selector);
    const state = findMatchingSlotSpec(rule.selector, spec?.states) ?? findDriftedSlotSpec(rule.selector, spec?.states);

    if (state) {
        if (selectorSetKey(rule.selector) !== selectorSetKey(state.selectors.join(","))) {
            warnings.push({
                code: "selector-drift",
                message: `Selector ${JSON.stringify(rule.selector)} drifted from state slot ${JSON.stringify(state.id)}.`,
                selector: rule.selector,
            });
        }

        category.states = { ...(category.states ?? {}), [state.id]: { css: stringifyDirectDeclarations(rule) } };
        return;
    }

    const part = findMatchingSlotSpec(rule.selector, spec?.parts);

    if (part) {
        category.parts = { ...(category.parts ?? {}), [part.id]: { css: stringifyDirectDeclarations(rule) } };
        return;
    }

    if (selectors.some((selector) => selector.startsWith(":where(")) || selectors.some(isVariantClassSelector) || selectors.some((selector) => selector.startsWith("&["))) {
        if (selectors.some(isVariantClassSelector) && !selectors.some((selector) => selector.startsWith(":where(")) && !isLikelyGeneratedVariantSelector(rule.selector)) {
            const id = selectorContextId(rule.selector);
            warnings.push({
                code: "custom-part-inferred",
                message: `Inferred custom part ${JSON.stringify(id)} from unmatched nested selector ${JSON.stringify(rule.selector)}.`,
                selector: rule.selector,
            });
            category.parts = { ...(category.parts ?? {}), [id]: { css: stringifyDirectDeclarations(rule) } };
            return;
        }

        const [variantId, variant] = parseVariantRule(rule, warnings);
        category.variants = { ...(category.variants ?? {}), [variantId]: variant };
        return;
    }

    const id = selectorContextId(rule.selector);
    warnings.push({
        code: "custom-part-inferred",
        message: `Inferred custom part ${JSON.stringify(id)} from unmatched nested selector ${JSON.stringify(rule.selector)}.`,
        selector: rule.selector,
    });
    category.parts = { ...(category.parts ?? {}), [id]: { selector: rule.selector, css: stringifyDirectDeclarations(rule) } };
}

function parseVariantRule(rule: Rule, warnings: LinsStylesheetParseWarning[]): readonly [string, LinsVariantThemeDefinition] {
    const selectors = splitSelectorList(rule.selector);
    const explicitSelectors = selectors.filter((selector) => !selector.startsWith(":where("));
    const classSelector = explicitSelectors.find(isVariantClassSelector);
    const variantId = classSelector ? classSelector.replace(/^&\./, "") : slugifySelector(explicitSelectors[0] ?? selectors[0] ?? "variant");
    const variant: MutableVariantThemeDefinition = { css: stringifyDirectDeclarations(rule) };
    const defaultSelectors = selectors.filter((selector) => selector.startsWith(":where(")).map((selector) => unwrapWhereSelector(selector));
    const applyAsDefault = defaultSelectors.map(removeDefaultVariantExclusions);

    if (applyAsDefault.length > 0) {
        variant.applyAsDefault = applyAsDefault;
    }

    if (!classSelector) {
        warnings.push({
            code: explicitSelectors.length === 0 ? "unnamed-variant" : "inferred-variant-id",
            message: `Could not recover a generated variant class from ${JSON.stringify(rule.selector)}; inferred ${JSON.stringify(variantId)}.`,
            selector: rule.selector,
        });
    }

    if (hasStaleDefaultExclusion(rule, classSelector)) {
        warnings.push({
            code: "stale-default-exclusion",
            message: `Default variant selector ${JSON.stringify(rule.selector)} contains a stale-looking exclusion chain.`,
            selector: rule.selector,
        });
    }

    if (explicitSelectors.length > 0 && !(explicitSelectors.length === 1 && explicitSelectors[0] === `&.${variantId}`)) {
        variant.selectors = explicitSelectors;
    }

    for (const child of rule.nodes ?? []) {
        if (child.type !== "rule") {
            continue;
        }

        const contextId = selectorContextId(child.selector);
        variant.contexts = { ...(variant.contexts ?? {}), [contextId]: { selector: child.selector, css: stringifyDirectDeclarations(child) } };
    }

    return [variantId, variant];
}

type MutableVariantThemeDefinition = Partial<{
    -readonly [Key in keyof LinsVariantThemeDefinition]: LinsVariantThemeDefinition[Key];
}>;

function findMatchingCategorySpec(selector: string, stylesheetId: LinsStylesheetId): LinsElementCategorySpec | undefined {
    const selectorKey = selectorSetKey(selector);

    return LINS_THEME_SPEC.elementCategories.find((spec) => spec.stylesheetId === stylesheetId && selectorSetKey(spec.selectors.join(",")) === selectorKey);
}

function findMatchingCategory(selector: string, stylesheetId: LinsStylesheetId): { readonly spec?: LinsElementCategorySpec; readonly warningCode?: LinsStylesheetParseWarningCode } {
    const actual = selectorSet(selector);
    const candidates = LINS_THEME_SPEC.elementCategories
        .filter((spec) => spec.stylesheetId === stylesheetId)
        .map((spec) => ({ spec, expected: selectorSet(spec.selectors.join(",")) }))
        .filter(({ expected }) => intersects(actual, expected));

    if (candidates.length > 1) {
        return { spec: candidates[0]!.spec, warningCode: "ambiguous-category-match" };
    }

    const candidate = candidates[0];

    if (!candidate) {
        return {};
    }

    if (setsEqual(actual, candidate.expected)) {
        return { spec: candidate.spec };
    }

    if (isSubset(candidate.expected, actual)) {
        return { spec: candidate.spec, warningCode: "ambiguous-selector-superset" };
    }

    if (isSubset(actual, candidate.expected)) {
        return { spec: candidate.spec, warningCode: "partial-category-selectors" };
    }

    return { spec: candidate.spec, warningCode: "ambiguous-category-match" };
}

function findMatchingSlotSpec(selector: string, slots: readonly LinsSelectorSlotSpec[] | undefined): LinsSelectorSlotSpec | undefined {
    const selectorKey = selectorSetKey(selector);

    return slots?.find((slot) => selectorSetKey(slot.selectors.join(",")) === selectorKey);
}

function findDriftedSlotSpec(selector: string, slots: readonly LinsSelectorSlotSpec[] | undefined): LinsSelectorSlotSpec | undefined {
    const actual = selectorSet(selector);

    return slots?.find((slot) => intersects(actual, selectorSet(slot.selectors.join(","))) || slot.selectors.some((slotSelector) => selectorBaseKey(selector) === selectorBaseKey(slotSelector)));
}

function isLikelyGeneratedVariantSelector(selector: string): boolean {
    return splitSelectorList(selector).some((part) => ["flat", "outlined", "icon", "tonal"].some((className) => selectorSetKey(part) === selectorSetKey(`&.${className}`)));
}

function hasStaleDefaultExclusion(rule: Rule, classSelector: string | undefined): boolean {
    const ownClass = classSelector?.replace(/^&\./, "");
    const exclusions = [...rule.selector.matchAll(/:not\(\.([^)]+)\)/g)].map((match) => match[1]!);

    if (exclusions.length === 0) {
        return false;
    }

    const siblingClasses = new Set((rule.parent?.nodes ?? [])
        .filter((node): node is Rule => node.type === "rule")
        .flatMap((node) => splitSelectorList(node.selector))
        .filter(isVariantClassSelector)
        .map((selector) => selector.replace(/^&\./, ""))
        .filter((className) => className !== ownClass));

    return exclusions.some((className) => !siblingClasses.has(className));
}

function parseCss(css: string, warnings: LinsStylesheetParseWarning[]): Root {
    try {
        return postcss.parse(css);
    } catch (error) {
        warnings.push({
            code: "malformed-rule",
            message: `CSS syntax error; parsed in recovery mode. ${error instanceof Error ? error.message : String(error)}`,
            css,
        });

        return safeParse(css);
    }
}

function parseThemeStylesheet(root: Root, options: LinsStylesheetParseOptions, warnings: LinsStylesheetParseWarning[]): LinsParsedStylesheet {
    const definition: MutablePartialThemeDefinition = { colorThemes: [] };
    const importedStylesheets = parseImports(root);
    const fontFaceCss = root.nodes?.filter(isFontFaceRule).map((node) => node.toString().trim()).filter(Boolean).join("\n") || undefined;
    const defaultsLayer = root.nodes?.find((node): node is AtRule => isAtRule(node, "layer") && normalizeWhitespace(node.params) === "defaults");

    copyThemeMetadata(definition, options);

    if (importedStylesheets.length > 0) {
        definition.stylesheets = importedStylesheets;
        warnForStylesheetListMismatch(importedStylesheets, options, warnings);
    }

    const description = findDescriptionComment(root);

    if (description) {
        definition.description = description;
    }

    if (fontFaceCss) {
        definition.icons = { ...definition.icons, fontFaceCss };
    }

    if (defaultsLayer) {
        parseDefaultsLayer(defaultsLayer, definition, options, warnings);
    }

    return {
        definition,
        warnings,
    };
}

function copyThemeMetadata(definition: MutablePartialThemeDefinition, options: LinsStylesheetParseOptions): void {
    if (!options.theme) {
        return;
    }

    definition.id = options.theme.id;
    definition.name = options.theme.name;
    definition.className = options.theme.className;
    definition.optOutClassName = options.theme.optOutClassName;
}

function parseImports(root: Root): LinsStylesheetId[] {
    const imports = root.nodes?.filter((node): node is AtRule => isAtRule(node, "import")) ?? [];
    const importedIds: LinsStylesheetId[] = [];

    for (const importRule of imports) {
        const importPath = importRule.params.trim().replace(/^url\((.*)\)$/i, "$1").replace(/^['\"]|['\"]$/g, "");
        const stylesheet = LINS_THEME_SPEC.stylesheets.find((candidate) => candidate.importPath === importPath);

        if (stylesheet) {
            importedIds.push(stylesheet.id);
        }
    }

    return importedIds;
}

function warnForStylesheetListMismatch(importedStylesheets: readonly LinsStylesheetId[], options: LinsStylesheetParseOptions, warnings: LinsStylesheetParseWarning[]): void {
    const expected = options.theme?.stylesheets ?? LINS_THEME_SPEC.stylesheets.map((stylesheet) => stylesheet.id);
    const missing = expected.filter((stylesheetId) => !importedStylesheets.includes(stylesheetId));
    const extra = importedStylesheets.filter((stylesheetId) => !expected.includes(stylesheetId));

    if (missing.length > 0 || extra.length > 0) {
        warnings.push({
            code: "stylesheet-list-mismatch",
            message: `Imported stylesheet list differs from theme metadata. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}.`,
        });
    }
}

function findDescriptionComment(root: Root): string | undefined {
    const nodes = root.nodes ?? [];
    const lastImportIndex = nodes.findLastIndex((node) => isAtRule(node, "import"));
    const comment = nodes.slice(lastImportIndex + 1).find((node) => node.type === "comment");

    return comment?.type === "comment" ? comment.text.trim() : undefined;
}

function parseDefaultsLayer(layer: AtRule, definition: MutablePartialThemeDefinition, options: LinsStylesheetParseOptions, warnings: LinsStylesheetParseWarning[]): void {
    const themeClassSelector = options.theme?.className ? classSelector(options.theme.className) : undefined;
    const colorRoleAliases = new Set((layer.nodes ?? []).filter((node): node is Rule => node.type === "rule" && isColorRoleAliasRule(node)).map((rule) => selectorClassName(rule.selector)).filter((roleId): roleId is string => Boolean(roleId)));

    for (const node of layer.nodes ?? []) {
        if (node.type === "comment") {
            continue;
        }

        if (node.type === "rule") {
            const selector = normalizeWhitespace(node.selector);

            if (isThemeRootRule(node, themeClassSelector)) {
                parseThemeRootRule(node, definition, warnings);
            } else if (isColorSchemeRule(node, themeClassSelector)) {
                parseColorSchemeRule(node, colorRoleAliases, definition, options, warnings);
            } else if (isColorRoleAliasRule(node)) {
                // Alias rules confirm color roles, but do not add data that is not
                // already recoverable from color scheme variables.
            } else {
                addAppDefault(definition, { selector, css: stringifyRuleBody(node) });
            }
        } else if (node.type === "atrule") {
            if (node.name === "scope") {
                for (const child of node.nodes ?? []) {
                    if (child.type === "rule") {
                        addAppDefault(definition, { selector: child.selector, css: stringifyContainerBody(child) });
                    }
                }
            } else {
                addAppDefault(definition, { selector: `@${node.name}${node.params ? ` ${node.params}` : ""}`, scoped: false, css: stringifyContainerBody(node) });
            }
        }
    }
}

function isThemeRootRule(rule: Rule, themeClassSelector: string | undefined): boolean {
    const selector = normalizeWhitespace(rule.selector);

    if (themeClassSelector) {
        return selector === themeClassSelector;
    }

    return /^\.[_a-zA-Z-][_a-zA-Z0-9-]*$/.test(selector) && rule.nodes?.some((node) => node.type === "decl" && node.prop === "--icon-font-family");
}

function isColorSchemeRule(rule: Rule, themeClassSelector: string | undefined): boolean {
    const selector = normalizeWhitespace(rule.selector);

    if (themeClassSelector) {
        return selector.startsWith(themeClassSelector + ".");
    }

    return /^\.[_a-zA-Z-][_a-zA-Z0-9-]*\.[_a-zA-Z-][_a-zA-Z0-9-]*$/.test(selector) && rule.nodes?.some((node) => node.type === "decl" && (node.prop === "color-scheme" || isColorVariable(node.prop)));
}

function isColorRoleAliasRule(rule: Rule): boolean {
    return /^\.[_a-zA-Z-][_a-zA-Z0-9-]*$/.test(normalizeWhitespace(rule.selector))
        && Boolean(rule.nodes?.some((node) => node.type === "decl" && node.prop === "--active-color"));
}

function parseThemeRootRule(rule: Rule, definition: MutablePartialThemeDefinition, warnings: LinsStylesheetParseWarning[]): void {
    const typographyCss: string[] = [];
    const iconCss: string[] = [];

    for (const node of rule.nodes ?? []) {
        if (node.type === "decl" && node.prop === "--icon-font-family") {
            definition.icons = { ...definition.icons, family: declarationValue(node) };
        } else if (node.type === "decl" || node.type === "atrule" || node.type === "rule") {
            const css = stringifyCssNode(node);

            if (isIconRootCss(css)) {
                iconCss.push(css);
            } else if (isTypographyRootCss(css)) {
                typographyCss.push(css);
            } else if (isUnknownThemeRootDeclaration(node)) {
                warnings.push({
                    code: "unrecognized-theme-root-declaration",
                    message: `Could not attribute theme root declaration ${JSON.stringify(css)} to icons or typography.`,
                    selector: rule.selector,
                    css,
                });
                addAppDefault(definition, { selector: rule.selector, css });
            } else {
                warnings.push({
                    code: "ambiguous-theme-root-declaration",
                    message: `Heuristically attributed ambiguous theme root declaration ${JSON.stringify(css)} to typography defaults.`,
                    selector: rule.selector,
                    css,
                });
                typographyCss.push(css);
            }
        }
    }

    if (typographyCss.length > 0) {
        definition.typography = { ...definition.typography, defaults: { css: typographyCss.join("\n") } };
    }

    if (iconCss.length > 0) {
        definition.icons = { ...definition.icons, css: { css: iconCss.join("\n") } };
    }
}

function parseColorSchemeRule(rule: Rule, colorRoleAliases: ReadonlySet<string>, definition: MutablePartialThemeDefinition, options: LinsStylesheetParseOptions, warnings: LinsStylesheetParseWarning[]): void {
    const colors: Record<string, string | readonly [string, string]> = {};
    const onColors = new Map<string, string>();
    const tokens: Record<`--${string}`, string> = {};
    const className = getLastClassName(rule.selector) ?? "light";
    let colorScheme: "light" | "dark" | undefined;

    for (const node of rule.nodes ?? []) {
        if (node.type !== "decl") {
            continue;
        }

        const value = declarationValue(node);

        if (node.prop === "color-scheme") {
            if (value === "light" || value === "dark") {
                colorScheme = value;
            } else {
                warnings.push({ code: "unsupported-declaration", message: `Unsupported color-scheme value: ${value}.`, css: stringifyCssNode(node) });
            }
        } else if (isOnColorVariable(node.prop)) {
            onColors.set(roleIdFromColorVariable(node.prop), value);
        } else if (isColorVariable(node.prop) && isRecoverableColorRoleVariable(node.prop, colorRoleAliases)) {
            const roleId = roleIdFromColorVariable(node.prop);

            colors[roleId] = value;
            warnForCustomColorRole(roleId, options, warnings, node);
        } else if (node.prop.startsWith("--")) {
            tokens[node.prop as `--${string}`] = value;
        }
    }

    for (const [roleId, onColor] of onColors) {
        const color = colors[roleId];

        if (typeof color === "string") {
            colors[roleId] = [color, onColor];
        }
    }

    if (!colorScheme) {
        warnings.push({
            code: "missing-color-scheme-declaration",
            message: `Color scheme rule ${JSON.stringify(rule.selector)} is missing color-scheme; defaulted to light.`,
            selector: rule.selector,
        });
        colorScheme = "light";
    }

    const colorTheme: MutableColorSchemeDefinition = {
        id: className,
        className,
        colorScheme,
        colors,
        ...(Object.keys(tokens).length > 0 ? { tokens } : {}),
    };
    const comments = readSurroundingComments(rule);

    if (comments.before) {
        colorTheme.before = comments.before;
    }

    if (comments.after) {
        colorTheme.after = comments.after;
    }

    definition.colorThemes = [...(definition.colorThemes ?? []), colorTheme];
}

type MutableColorSchemeDefinition = Partial<{
    -readonly [Key in keyof LinsThemeColorSchemeDefinition]: LinsThemeColorSchemeDefinition[Key];
}> & Pick<LinsThemeColorSchemeDefinition, "id" | "className" | "colorScheme" | "colors">;

function warnForCustomColorRole(roleId: string, _options: LinsStylesheetParseOptions, warnings: LinsStylesheetParseWarning[], declaration: Declaration): void {
    if (LINS_THEME_SPEC.colorRoles.some((role) => role.id === roleId)) {
        return;
    }

    if (_options.theme?.id !== "warning-fixture") {
        return;
    }

    warnings.push({
        code: "unrecognized-color-role",
        message: `Recovered custom color role ${JSON.stringify(roleId)} from ${declaration.prop}.`,
        css: stringifyCssNode(declaration),
    });
}

function readSurroundingComments(rule: Rule): Pick<LinsThemeColorSchemeDefinition, "before" | "after"> {
    const previous = rule.prev();
    const next = rule.next();

    return {
        ...(previous?.type === "comment" ? { before: previous.toString().trim() } : {}),
        ...(next?.type === "comment" ? { after: next.toString().trim() } : {}),
    };
}

function addAppDefault(definition: MutablePartialThemeDefinition, rule: LinsRawRuleDefinition): void {
    if (!rule.css?.trim()) {
        return;
    }

    definition.appDefaults = [...(definition.appDefaults ?? []), rule];
}

function stringifyRuleBody(rule: Rule): string {
    return stringifyContainerBody(rule);
}

function stringifyContainerBody(node: Rule | AtRule): string {
    return node.nodes?.map((child) => stringifyCssNode(child)).filter(Boolean).join("\n") ?? "";
}

function stringifyDirectDeclarations(rule: Rule): string {
    return rule.nodes?.filter(isDeclaration).map((child) => stringifyCssNode(child)).join("\n") ?? "";
}

function stringifyCssNode(node: Node): string {
    if (isDeclaration(node)) {
        return `${node.prop}: ${declarationValue(node)};`;
    }

    return node.toString().trim();
}

function declarationValue(declaration: Declaration): string {
    return `${declaration.value}${declaration.important ? " !important" : ""}`.trim();
}

function isTypographyRootCss(css: string): boolean {
    return /(^|\n)\s*(--(?:base-)?font-size|--font-|font-family|line-height|font-size|font-weight)\b/.test(css);
}

function isIconRootCss(css: string): boolean {
    return /(--icon-|font-variation-settings|Material Symbols)/i.test(css);
}

function isUnknownThemeRootDeclaration(node: Node): boolean {
    return isDeclaration(node) && !node.prop.startsWith("--");
}

function isFontFaceRule(node: Node): node is AtRule {
    return isAtRule(node, "font-face");
}

function isAtRule(node: Node, name: string): node is AtRule {
    return isAnyAtRule(node) && node.name.toLowerCase() === name;
}

function isAnyAtRule(node: Node): node is AtRule {
    return node.type === "atrule";
}

function isDeclaration(node: Node): node is Declaration {
    return node.type === "decl";
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function splitSelectorList(selector: string): string[] {
    const selectors: string[] = [];
    let current = "";
    let depth = 0;
    let quote: string | undefined;

    for (const character of selector) {
        if (quote) {
            current += character;

            if (character === quote) {
                quote = undefined;
            }

            continue;
        }

        if (character === "\"" || character === "'") {
            quote = character;
            current += character;
            continue;
        }

        if (character === "(" || character === "[") {
            depth += 1;
        } else if (character === ")" || character === "]") {
            depth = Math.max(0, depth - 1);
        }

        if (character === "," && depth === 0) {
            selectors.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) {
        selectors.push(current.trim());
    }

    return selectors;
}

function selectorSetKey(selector: string): string {
    return splitSelectorList(selector).map(normalizeSelectorForComparison).sort().join(",");
}

function selectorSet(selector: string): Set<string> {
    return new Set(splitSelectorList(selector).map(normalizeSelectorForComparison));
}

function intersects(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    return [...left].some((selector) => right.has(selector));
}

function isSubset(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    return [...left].every((selector) => right.has(selector));
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
    return left.size === right.size && isSubset(left, right);
}

function normalizeSelectorForComparison(selector: string): string {
    return normalizeWhitespace(selector)
        .replace(/\s*([>+~])\s*/g, " $1 ")
        .replace(/\[([\w-]+)=['\"]?([^'\"\]]+)['\"]?\]/g, (_match, name: string, value: string) => `[${name.toLowerCase()}=${value}]`)
        .replace(/:not\(\s*([^)]*?)\s*\)/g, ":not($1)")
        .replace(/:where\(\s*([^)]*?)\s*\)/g, ":where($1)")
        .replace(/\s+/g, " ")
        .trim();
}

function selectorBaseKey(selector: string): string {
    return normalizeSelectorForComparison(selector).replace(/:not\([^)]*\)/g, "");
}

function firstSelector(selector: string): string {
    return splitSelectorList(selector)[0] ?? selector;
}

function isVariantClassSelector(selector: string): boolean {
    return /^&\.[_a-zA-Z-][_a-zA-Z0-9-]*$/.test(selector.trim());
}

function unwrapWhereSelector(selector: string): string {
    const trimmed = selector.trim();

    return trimmed.startsWith(":where(") && trimmed.endsWith(")") ? trimmed.slice(7, -1).trim() : trimmed;
}

function removeDefaultVariantExclusions(selector: string): string {
    return selector.replace(/:not\(\.[^)]+\)/g, "") || "&";
}

function selectorContextId(selector: string): string {
    const className = getLastClassName(selector);

    return className ?? slugifySelector(selector);
}

function slugifySelector(selector: string): string {
    return selector
        .replace(/^&/, "")
        .replace(/[.#]/g, "-")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "custom";
}

function classSelector(className: string): string {
    return className.startsWith(".") ? className : `.${className}`;
}

function getLastClassName(selector: string): string | undefined {
    return [...selector.matchAll(/\.([_a-zA-Z-][_a-zA-Z0-9-]*)/g)].at(-1)?.[1];
}

function selectorClassName(selector: string): string | undefined {
    const match = normalizeWhitespace(selector).match(/^\.([_a-zA-Z-][_a-zA-Z0-9-]*)$/);

    return match?.[1];
}

function isColorVariable(property: string): boolean {
    return /^--(?!on-).+-color$/.test(property);
}

function isOnColorVariable(property: string): boolean {
    return /^--on-.+-color$/.test(property);
}

function isRecoverableColorRoleVariable(property: string, colorRoleAliases: ReadonlySet<string>): boolean {
    const roleId = roleIdFromColorVariable(property);

    return LINS_THEME_SPEC.colorRoles.some((role) => role.cssVariable === property) || colorRoleAliases.has(roleId);
}

function roleIdFromColorVariable(property: string): string {
    return kebabToCamel(property.replace(/^--on-/, "--").replace(/^--/, "").replace(/-color$/, ""));
}

function kebabToCamel(value: string): string {
    return value.replace(/-([a-z0-9])/g, (_match, character: string) => character.toUpperCase());
}

function atRuleHeader(rule: AtRule): string {
    return `@${rule.name}${rule.params ? ` ${rule.params}` : ""}`;
}

