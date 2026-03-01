import type {Rule} from "@unocss/core"
import {number, rem} from "./utils/PresetUtils"


const sizeMapping: Record<string, string> = {
    h: 'height',
    w: 'width',
    inline: 'inline-size',
    block: 'block-size',
}

function getPropName(minmax: string, hw: string) {
    return `${minmax || ''}${sizeMapping[hw]}`
}

function getSizeValue(_: string, __: string, ___: {}, prop: string) {
    if (prop === "auto") {
        return "auto"
    }

    switch (prop) {
        case 'fit':
        case 'max':
        case 'min':
            return `${prop}-content`
    }

    if (prop === "full") {
        return "100%"
    }

    return rem(prop)
}

export const sizes: Rule[] = [
    [/^sizing-(min-|max-)?(.+)$/, ([, m, s], { theme }) => ({ [getPropName(m, 'w')]: getSizeValue(m, 'w', theme, s), [getPropName(m, 'h')]: getSizeValue(m, 'h', theme, s) })],
    [/^sizing-(min-|max-)?([wh])-?(.+)$/, ([, m, w, s], { theme }) => ({[getPropName(m, w)]: getSizeValue(m, w, theme, s)})],
    [/^sizing-(min-|max-)?(block|inline)-(.+)$/, ([, m, w, s], { theme }) => ({ [getPropName(m, w)]: getSizeValue(m, w, theme, s) }), {
        autocomplete: [
            'sizing-(w|h)-$width|height|maxWidth|maxHeight|minWidth|minHeight|inlineSize|blockSize|maxInlineSize|maxBlockSize|minInlineSize|minBlockSize',
            'sizing-(block|inline)-$width|height|maxWidth|maxHeight|minWidth|minHeight|inlineSize|blockSize|maxInlineSize|maxBlockSize|minInlineSize|minBlockSize',
            'sizing-(max|min)-(w|h|block|inline)',
            'sizing-(max|min)-(w|h|block|inline)-$width|height|maxWidth|maxHeight|minWidth|minHeight|inlineSize|blockSize|maxInlineSize|maxBlockSize|minInlineSize|minBlockSize',
            'sizing-(w|h)-full',
            'sizing-(max|min)-(w|h)-full',
        ],
    }]
]

function getAspectRatio(prop: string) {
    if (/^\d+\/\d+$/.test(prop))
        return prop

    switch (prop) {
        case 'square': return '1/1'
        case 'video': return '16/9'
    }

    return number(prop)
}

export const aspectRatio: Rule[] = [
    [/^(?:sizing-)?aspect-(?:ratio-)?(.+)$/, ([, d]: string[]) => ({ 'aspect-ratio': getAspectRatio(d) }), { autocomplete: ['aspect-(square|video|ratio)', 'aspect-ratio-(square|video)'] }],
]
