import type {Rule} from "@unocss/core"
import {bracket, cssvar, number} from "./utils/PresetUtils"

function rowCol(s: string) {
    return s.replace('col', 'column')
}

export const grids: Rule[] = [
    [/^(?:grid-)?(row|col)-span-(.+)$/, ([, c, s]) => {
        if (s === 'full')
            return { [`grid-${rowCol(c)}`]: '1/-1' }
        const v = number(s)
        if (v != null)
            return { [`grid-${rowCol(c)}`]: `span ${v}/span ${v}` }
    }, { autocomplete: '(grid-row|grid-col|row|col)-span-<num>' }],

    // starts & ends
    [/^(?:grid-)?(row|col)-start-(.+)$/, ([, c, v]) => ({ [`grid-${rowCol(c)}-start`]: cssvar(v) ?? v })],
    [/^(?:grid-)?(row|col)-end-(.+)$/, ([, c, v]) => ({ [`grid-${rowCol(c)}-end`]: cssvar(v) ?? v }), { autocomplete: '(grid-row|grid-col|row|col)-(start|end)-<num>' }],

    // templates
    [/^(?:grid-)?(rows|cols)-(.+)$/, ([, c, v]) => ({
        [`grid-template-${rowCol(c)}`]: cssvar(v) ?? v,
        display: "grid"
    })],
    [/^(?:grid-)?(rows|cols)-\[(.+)]$/, ([, c, v]) => ({
        [`grid-template-${rowCol(c)}`]: v.split(",").map(i => cssvar(i) ?? i).join(" "),
        display: "grid",
    })],
    [/^(?:grid-)?(rows|cols)-minmax-([\w.-]+)$/, ([, c, d]) => ({ [`grid-template-${rowCol(c)}`]: `repeat(auto-fill,minmax(${d},1fr))` })],
    [/^(?:grid-)?(rows|cols)-(\d+)$/, ([, c, d]) => ({ [`grid-template-${rowCol(c)}`]: `repeat(${d},minmax(0,1fr))` }), { autocomplete: '(grid-rows|grid-cols|rows|cols)-<num>' }],

    // areas
    [/^grid-area(s)?-(.+)$/, ([, s, v]) => {
        if (s != null)
            return { 'grid-template-areas': cssvar(v) ?? v.split('-').map(s => `"${bracket(s)}"`).join(' ') }
        return { 'grid-area': cssvar(v) }
    }],

    // template none
    ['grid-rows-none', { 'grid-template-rows': 'none' }],
    ['grid-cols-none', { 'grid-template-columns': 'none' }],

    // template subgrid
    ['grid-rows-subgrid', { 'grid-template-rows': 'subgrid' }],
    ['grid-cols-subgrid', { 'grid-template-columns': 'subgrid' }],
]
