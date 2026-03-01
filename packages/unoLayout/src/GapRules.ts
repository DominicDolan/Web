
import type { Rule } from '@unocss/core'
import {rem} from "./utils/PresetUtils"

const directions: Record<string, string> = {
    '': '',
    'x': 'column-',
    'y': 'row-',
    'col': 'column-',
    'row': 'row-',
}

function handleGap([, d = '', s]: string[]) {
    const v = rem(s)
    if (v != null) {
        return {
            [`${directions[d]}gap`]: v,
        }
    }
}

export const gaps: Rule[] = [
    [/^(?:flex-|grid-)?gap-()(\d+.*)$/, handleGap, { autocomplete: ['gap-$spacing', 'gap-<num>'] }],
    [/^(?:flex-|grid-)?gap([xy])-?(\d+.*)$/, handleGap, { autocomplete: ['gap-(x|y)-$spacing', 'gap-(x|y)-<num>'] }],
]
