export interface LinsThemeInfo {
    readonly id: string;
    readonly name: string;
    readonly className: string;
    readonly description: string;
    readonly colors: readonly LinsColorRoleInfo[];
    readonly colorThemes: readonly LinsColorThemeInfo[];
    readonly elementCategories: readonly LinsElementCategoryInfo[];
}

export interface LinsColorRoleInfo {
    readonly id: string;
    readonly name: string;
    readonly cssVariable: string;
    readonly onCssVariable: string;
    readonly description: string;
}

export interface LinsColorThemeInfo {
    readonly id: string;
    readonly name: string;
    readonly className: string;
    readonly colorScheme: "light" | "dark";
    readonly description: string;
    readonly colors: readonly LinsColorThemeValue[];
}

export interface LinsColorThemeValue {
    readonly role: string;
    readonly color: string;
    readonly onColor: string;
}

export interface LinsElementCategoryInfo {
    readonly id: string;
    readonly name: string;
    readonly file: string;
    readonly selectors: readonly string[];
    readonly description: string;
    readonly variants: readonly LinsVariantInfo[];
}

export interface LinsVariantInfo {
    readonly id: string;
    readonly className: string;
    readonly name: string;
    readonly description: string;
    readonly default?: boolean;
}

