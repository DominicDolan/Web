import materialInspiredThemeInfo from "./materialInspired/theme.ts";

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

import { minimalThemeInfo } from "./minimal/theme.ts";
import { foundryThemeInfo } from "./foundry/theme.ts";

export const linsThemes = [minimalThemeInfo, foundryThemeInfo, materialInspiredThemeInfo] as const;

export type LinsThemeId = typeof linsThemes[number]["id"];

export function getLinsThemeInfo(id: LinsThemeId | string) {
    return linsThemes.find((theme) => theme.id === id);
}

