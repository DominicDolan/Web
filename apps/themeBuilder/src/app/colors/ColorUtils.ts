import {Accessor, createMemo} from "solid-js";
import {getBestContrastColor, getContrastRatio, getRelativeLuminance, hexToRgb, rgbToHsl} from "@web/utils/Colors.js";


export function useColorNameUtils() {
    function variableNameToTitle(name: string) {
        return name
            .replace("--", "")
            .replace(/-/g, " ")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase())
    }

    return { variableNameToTitle }
}

export function useColorUtils(colorHex: Accessor<string>) {
    const rgb = createMemo(() => hexToRgb(colorHex()));
    const hsl = createMemo(() => {
        const val = rgb();
        return val ? rgbToHsl(val.r, val.g, val.b) : null;
    });

    const bestContrast = createMemo(() => {
        const val = rgb();
        return val ? getBestContrastColor(val.r, val.g, val.b) : "black";
    });

    const contrastRatio = createMemo(() => {
        const val = rgb();
        if (!val) return 0;
        const luminance = getRelativeLuminance(val.r, val.g, val.b);
        const contrastLuminance = bestContrast() === "white" ? 1.0 : 0.0;
        return getContrastRatio(luminance, contrastLuminance);
    });

    return {
        rgb,
        hsl,
        contrastRatio,
        bestContrast
    }
}
