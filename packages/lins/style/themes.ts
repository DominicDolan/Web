import materialInspiredThemeInfo from "./materialInspired/theme.ts";
import signalBloomThemeInfo from "./signalBloom/theme.ts";
import apertureThemeDefinition from "./aperture/theme.ts";
import { LINS_THEME_SPEC, type LinsThemeDefinition, type LinsThemeColorValueDefinition } from "../src/generator/index.ts";
import type { LinsColorThemeValue, LinsElementCategoryInfo, LinsThemeInfo, LinsVariantInfo } from "./themeInfo.ts";

export type {
    LinsColorRoleInfo,
    LinsColorThemeInfo,
    LinsColorThemeValue,
    LinsElementCategoryInfo,
    LinsThemeInfo,
    LinsVariantInfo,
} from "./themeInfo.ts";

export { minimalThemeInfo } from "./minimal/theme.ts";
export { foundryThemeInfo } from "./foundry/theme.ts";
export { materialInspiredThemeInfo } from "./materialInspired/theme.ts";
export { signalBloomThemeInfo } from "./signalBloom/theme.ts";
export { apertureThemeDefinition };

import { minimalThemeInfo } from "./minimal/theme.ts";
import { foundryThemeInfo } from "./foundry/theme.ts";

function titleCase(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function colorValue(role: string, value: LinsThemeColorValueDefinition): LinsColorThemeValue {
    if (typeof value === "string") {
        return { role, color: value, onColor: "currentColor" };
    }

    if ("color" in value) {
        return { role, color: value.color, onColor: value.onColor };
    }

    return { role, color: value[0], onColor: value[1] };
}

function variantInfo(id: string, variant: { readonly className?: string; readonly default?: boolean; readonly css?: string } = {}): LinsVariantInfo {
    return {
        id,
        className: variant.className ?? id,
        name: titleCase(id),
        description: `${titleCase(id)} variant generated from the defineLinsTheme configuration.`,
        default: variant.default,
    };
}

function categoryFile(theme: LinsThemeDefinition, stylesheetId: string): string {
    const stylesheet = LINS_THEME_SPEC.stylesheets.find((item) => item.id === stylesheetId);
    return `style/${theme.id}/${stylesheet?.fileName ?? `${stylesheetId}.css`}`;
}

function definedThemeInfo(theme: LinsThemeDefinition): LinsThemeInfo {
    const categories: LinsElementCategoryInfo[] = [
        {
            id: "typography",
            name: "Typography",
            file: categoryFile(theme, LINS_THEME_SPEC.typography.stylesheetId),
            selectors: ["body", "h1", "h2", "h3", "h4", "h5", "h6", ".display", ".headline", ".title", ".body", ".label"],
            description: "Composable generated type scale using role, size, and muted variant classes.",
            variants: [
                ...LINS_THEME_SPEC.typography.roles.map((role) => ({ id: role.id, className: role.className, name: role.id[0].toUpperCase() + role.id.slice(1), description: role.description })),
                ...LINS_THEME_SPEC.typography.sizes.map((size) => ({ id: size.id, className: size.className, name: size.id[0].toUpperCase() + size.id.slice(1), description: size.description, default: size.id === "medium" })),
                { id: "variant", className: "variant", name: "Variant", description: "Muted/secondary treatment composed with a type role." },
            ],
        },
    ];

    for (const spec of LINS_THEME_SPEC.elementCategories) {
        const definition = theme.categories?.[spec.id];
        categories.push({
            id: spec.id,
            name: spec.name,
            file: categoryFile(theme, spec.stylesheetId),
            selectors: spec.selectors,
            description: spec.description,
            variants: Object.entries(definition?.variants ?? {}).map(([id, variant]) => variantInfo(id, variant)),
        });
    }

    categories.push({
        id: "empty-state",
        name: "Empty State",
        file: categoryFile(theme, "empty-state"),
        selectors: ["empty-state", "empty-state.skeleton", "empty-state.empty"],
        description: "Custom placeholder element for loading skeletons and empty-content panels.",
        variants: [
            { id: "skeleton", className: "skeleton", name: "Skeleton", description: "Placeholder blocks that shimmer while aria-busy is present." },
            { id: "empty", className: "empty", name: "Empty", description: "Empty-content panel with an inset border and decoration." },
        ],
    });

    return {
        id: theme.id,
        name: `${theme.name} (Generated)`,
        className: theme.className,
        description: theme.description ?? `${theme.name} theme generated from defineLinsTheme.`,
        colors: LINS_THEME_SPEC.colorRoles,
        colorThemes: theme.colorThemes.map((scheme) => ({
            id: scheme.id,
            name: scheme.name ?? titleCase(scheme.id),
            className: scheme.className,
            colorScheme: scheme.colorScheme,
            description: scheme.description ?? `${titleCase(scheme.id)} colour theme.`,
            colors: Object.entries(scheme.colors).map(([role, value]) => colorValue(role, value as LinsThemeColorValueDefinition)),
        })),
        elementCategories: categories,
    };
}

export const apertureThemeInfo = definedThemeInfo(apertureThemeDefinition);

export const linsThemes = [minimalThemeInfo, foundryThemeInfo, materialInspiredThemeInfo, signalBloomThemeInfo, apertureThemeInfo] as const;

export type LinsThemeId = typeof linsThemes[number]["id"];

export function getLinsThemeInfo(id: LinsThemeId | string) {
    return linsThemes.find((theme) => theme.id === id);
}

