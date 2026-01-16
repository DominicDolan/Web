
import type { Rule } from '@unocss/core'
import type {CSSEntries} from "unocss"
import {directionMap} from "./utils/PresetMappings"
import {rem} from "./utils/PresetUtils"

export function directionSize(propertyPrefix: string) {
    return (value: string[]): CSSEntries | undefined => {
        const [_, direction, size] = value

        const v = size === "auto" ? size : rem(size)

        if (v != null) {
            return directionMap[direction].map(i => [`${propertyPrefix}${i}`, v])
        }
    }
}

export const spacing: Rule[] = [
    [/^spacing-pa()-(\d+.*)$/, directionSize('padding')],
    [/^spacing-p([xy])-(\d+.*)$/, directionSize('padding')],
    [/^spacing-p([rltbse])-(\d+.*)$/, directionSize('padding')],
    [/^spacing-p-(block|inline)-(\d+.*)$/, directionSize('padding')],
    [/^spacing-p-([bi][se])-(\d+.*)$/, directionSize('padding')],
    [/^spacing-ma()-((\d+.*)|auto)$/, directionSize('margin'), { autocomplete: ['spacing-(ma|pa)-<num>'] }],
    [/^spacing-m([xy])-(\d+.*|auto)$/, directionSize('margin')],
    [/^spacing-m([rltbse])-(\d+.*|auto)$/, directionSize('margin'), { autocomplete: 'spacing-(m|p)<directions>-<num>' }],
    [/^spacing-m-(block|inline)-(\d+.*|auto)$/, directionSize('margin'), { autocomplete: 'spacing-(m|p)-(block|inline)-<num>' }],
    [/^spacing-m-([bi][se])-(\d+.*|auto)$/, directionSize('margin'), { autocomplete: 'spacing-(m|p)-(bs|be|is|ie)-<num>' }],
]
