import type {Rule} from "@unocss/core"
import {number, rem} from "./utils/PresetUtils"

export const flex: Rule[] = [
    // display
    ['flex', { display: 'flex' }],
    ['inline-flex', { display: 'inline-flex' }],
    ['flex-inline', { display: 'inline-flex' }],

    // flex
    ['flex-1', { flex: '1 1 0%' }],
    ['flex-auto', { flex: '1 1 auto' }],
    ['flex-initial', { flex: '0 1 auto' }],
    ['flex-none', { flex: 'none' }],

    // shrink/grow/basis
    [/^(?:flex-)?shrink-(\d)$/, ([, d = '']) => ({ 'flex-shrink': number(d) ?? 1 }), { autocomplete: ['flex-shrink-<num>', 'shrink-<num>'] }],
    [/^(?:flex-)?shrink$/, ([, ]) => ({ 'flex-shrink': 1 }), { autocomplete: ['flex-shrink-<num>', 'shrink-<num>'] }],
    [/^(?:flex-)?grow-(\d)$/, ([, d = '']) => ({ 'flex-grow': number(d) ?? 1 }), { autocomplete: ['flex-grow-<num>', 'grow-<num>'] }],
    [/^(?:flex-)?grow$/, ([, ]) => ({ 'flex-grow': 1 }), { autocomplete: ['flex-grow-<num>', 'grow-<num>'] }],
    [/^(?:flex-)?basis-(\d)$/, ([, d]) => ({ 'flex-basis': rem(d) }), { autocomplete: ['flex-basis-$spacing', 'basis-$spacing'] }],

    // directions
    ['flex-row', { display: 'flex', 'flex-direction': 'row' }],
    ['flex-row-reverse', { display: 'flex', 'flex-direction': 'row-reverse' }],
    ['flex-col', { display: 'flex', 'flex-direction': 'column' }],
    ['flex-col-reverse', { display: 'flex', 'flex-direction': 'column-reverse' }],

    // wraps
    ['flex-wrap', { 'flex-wrap': 'wrap' }],
    ['flex-wrap-reverse', { 'flex-wrap': 'wrap-reverse' }],
    ['flex-nowrap', { 'flex-wrap': 'nowrap' }],

    //align
    ['flex-start', { 'align-items': 'flex-start' }],
    ['flex-end', { 'align-items': 'flex-end' }],
    ['flex-center', { 'align-items': 'center' }],
    ['flex-baseline', { 'align-items': 'baseline' }],
    ['flex-stretch', { 'align-items': 'stretch' }],
    ['flex-space-around', { 'justify-content': 'space-around' }],
    ['flex-space-between', { 'justify-content': 'space-between' }],

]
