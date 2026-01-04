import {ColorDefinition} from "~/data/ColorDefinition";


export default function ExportCSSButton(props: {colorModels: ColorDefinition[]}) {

    function hexToCssColor(hex: string, fallbackAlpha = 1): string {
        const h = hex.trim().replace(/^#/, "").toLowerCase();

        const expand = (c: string) => c + c;

        let r: number, g: number, b: number, a: number | null = null;

        if (h.length === 3 || h.length === 4) {
            r = parseInt(expand(h[0]!), 16);
            g = parseInt(expand(h[1]!), 16);
            b = parseInt(expand(h[2]!), 16);
            if (h.length === 4) a = parseInt(expand(h[3]!), 16) / 255;
        } else if (h.length === 6 || h.length === 8) {
            r = parseInt(h.slice(0, 2), 16);
            g = parseInt(h.slice(2, 4), 16);
            b = parseInt(h.slice(4, 6), 16);
            if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
        } else {
            throw new Error(`Invalid hex color: ${hex}`);
        }

        const alpha = a ?? fallbackAlpha;
        const clamped = Math.max(0, Math.min(1, alpha));

        // Use modern CSS rgb() syntax with slash alpha
        return clamped < 1
            ? `rgb(${r} ${g} ${b} / ${Number(clamped.toFixed(3))})`
            : `#${h.length === 3 || h.length === 4 ? h.slice(0, 3).split("").map(expand).join("") : h.slice(0, 6)}`;
    }

    function exportToCss() {
        const cssContent = `:root {\n${props.colorModels
            .map(color => `  ${color.name}: ${hexToCssColor(color.hex, color.alpha)};`)
            .join('\n')}\n}`

        const blob = new Blob([cssContent], {type: 'text/css'})
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'colors.css'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return <button onClick={() => exportToCss()}>Export CSS</button>
}
