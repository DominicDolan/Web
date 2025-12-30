import {definePreset} from "unocss"
import {gaps} from "./GapRules"
import {spacing} from "./SpacingRules"
import {flex} from "./FlexRules"
import {aspectRatio, sizes} from "./SizeRules"
import {grids} from "./GridRules"
import {textAligns} from "./AlignRules";
import {displayRules} from "./DisplayRules";


export const layoutPreset = definePreset(() => {
    return {
        name: "layout-preset",
        rules: [
            ...gaps,
            ...spacing,
            ...flex,
            ...grids,
            ...sizes,
            ...aspectRatio,
            ...textAligns,
            ...displayRules
        ]
    }
})
