import {escapeSelector} from "@unocss/core"

export const numberWithUnitRE = /^(-?\d*(?:\.\d+)?)(px|pt|pc|%|r?(?:em|ex|lh|cap|ch|ic)|(?:[sld]?v|cq)(?:[whib]|min|max)|in|cm|mm|rpx)?$/i
export const numberRE = /^(-?\d*(?:\.\d+)?)$/
export const unitOnlyRE = /^(px|[sld]?v[wh])$/i
export const unitOnlyMap: Record<string, number> = {
    px: 1,
    vw: 100,
    vh: 100,
    svw: 100,
    svh: 100,
    dvw: 100,
    dvh: 100,
    lvh: 100,
    lvw: 100,
}
export const bracketTypeRe = /^\[(color|image|length|size|position|quoted|string):/i
export const splitComma = /,(?![^()]*\))/g

function round(n: number) {
    return +n.toFixed(10)
}

export function numberWithUnit(str: string) {
    const match = str.match(numberWithUnitRE)
    if (!match)
        return
    const [, n, unit] = match
    const num = Number.parseFloat(n)
    if (unit && !Number.isNaN(num))
        return `${round(num)}${unit}`
}

export function cssvar(str: string) {
    if (/^\$[^\s'"`;{}]/.test(str)) {
        const [name, defaultValue] = str.slice(1).split(',')
        return `var(--${escapeSelector(name)}${defaultValue ? `, ${defaultValue}` : ''})`
    }
}

export function rem(str: string) {
    if (!str)
        return
    if (unitOnlyRE.test(str))
        return `${unitOnlyMap[str]}${str}`
    const match = str.match(numberWithUnitRE)
    if (!match)
        return
    const [, n, unit] = match
    const num = Number.parseFloat(n)
    if (!Number.isNaN(num)) {
        if (num === 0)
            return '0'
        return unit ? `${round(num)}${unit}` : `${round(num / 4)}rem`
    }
}

export function number(str: string) {
    if (!numberRE.test(str))
        return
    const num = Number.parseFloat(str)
    if (!Number.isNaN(num))
        return round(num)
}


function bracketWithType(str: string, requiredType?: string) {
    if (str && str.startsWith('[') && str.endsWith(']')) {
        let base: string | undefined
        let hintedType: string | undefined

        const match = str.match(bracketTypeRe)
        if (!match) {
            base = str.slice(1, -1)
        }
        else {
            if (!requiredType) {
                hintedType = match[1]
            }
            else if (match[1] !== requiredType) {
                return
            }

            base = str.slice(match[0].length, -1)
        }

        if (!base)
            return

        // test/preset-attributify.test.ts > fixture5
        if (base === '=""')
            return

        let curly = 0
        for (const i of base) {
            if (i === '[') {
                curly += 1
            }
            else if (i === ']') {
                curly -= 1
                if (curly < 0)
                    return
            }
        }
        if (curly)
            return

        switch (hintedType) {
            case 'string': return base
                .replace(/(^|[^\\])_/g, '$1 ')
                .replace(/\\_/g, '_')

            case 'quoted': return base
                .replace(/(^|[^\\])_/g, '$1 ')
                .replace(/\\_/g, '_')
                .replace(/(["\\])/g, '\\$1')
                .replace(/^(.+)$/, '"$1"')
        }

        return base
            .replace(/(url\(.*?\))/g, v => v.replace(/_/g, '\\_'))
            .replace(/(^|[^\\])_/g, '$1 ')
            .replace(/\\_/g, '_')
            .replace(/(?:calc|clamp|max|min)\((.*)/g, (match) => {
                const vars: string[] = []
                return match
                    .replace(/var\((--.+?)[,)]/g, (match, g1) => {
                        vars.push(g1)
                        return match.replace(g1, '--un-calc')
                    })
                    .replace(/(-?\d*\.?\d(?!-\d.+[,)](?![^+\-/*])\D)(?:%|[a-z]+)?|\))([+\-/*])/g, '$1 $2 ')
                    .replace(/--un-calc/g, () => vars.shift()!)
            })
    }
}

export function bracket(str: string) {
    return bracketWithType(str, undefined)
}
