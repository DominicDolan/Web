import { defineLinsTheme } from "../../src/generator";
import { dedent } from "@web/utils/TrimIndent.ts";
import type { LinsThemeDefinition } from "../../src/generator";

export const apertureThemeInfo = defineLinsTheme({
    id: "aperture",
    name: "Aperture",
    className: "aperture",
    description: "A calm, editorial LINS theme with warm neutrals, soft optical elevation, precise typography, and gallery-like surface framing.",
    stylesheets: ["button", "text", "card", "input", "list", "icon", "popover", "empty-state", "navigation"],
    colorThemes: [
        {
            id: "light",
            name: "Light",
            className: "light",
            colorScheme: "light",
            description: "Warm editorial light palette with porcelain background, white sheets, ink-blue primary text, and lens-blue accents.",
            colors: {
                primary: ["#172033", "#f8fbff"],
                secondary: ["#5e6878", "#ffffff"],
                surface: ["#fffdf8", "#172033"],
                background: ["#f4f0e8", "#1c2433"],
                accent: ["#2f74d0", "#ffffff"],
                success: ["#2f7d5c", "#f4fff9"],
                warning: ["#b47a12", "#fff8e8"],
                error: ["#b83a4b", "#fff7f8"],
            },
            tokens: { "--shadow-color": "oklab(from #172033 l a b / 0.18)" },
        },
        {
            id: "dark",
            name: "Dark",
            className: "dark",
            colorScheme: "dark",
            description: "Quiet dark palette with blue-black background, graphite surfaces, soft foregrounds, and luminous lens-blue accents.",
            colors: {
                primary: ["#edf4ff", "#111827"],
                secondary: ["#9aa8bc", "#101722"],
                surface: ["#1d2430", "#edf2f8"],
                background: ["#111722", "#e7ecf4"],
                accent: ["#70a7ff", "#07152b"],
                success: ["#6fcf9f", "#062015"],
                warning: ["#e4b557", "#241800"],
                error: ["#ef7c8d", "#2a0710"],
            },
            tokens: { "--shadow-color": "oklab(from black l a b / 0.48)" },
        },
    ],
    typography: {
        defaults: {
            css: dedent`
                --font-family: Inter, Geist, "Avenir Next", "IBM Plex Sans", "Source Sans 3", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                --mono-font-family: "Cascadia Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                --base-font-size: 16px;
                --font-size: var(--base-font-size);
                --line-height: 1.58;
                --heading-line-height: 1.16;
                --heading-font-weight: 650;
            `,
        },
        roles: {
            display: { css: dedent`
    --font-size: 3rem;
    line-height: 1.08;
    font-weight: 680;
    letter-spacing: -0.045em;
    color: color-mix(in oklab, currentColor 90%, var(--primary-color));
` },
            headline: { css: dedent`
    --font-size: 1.9rem;
    line-height: 1.14;
    font-weight: 650;
    letter-spacing: -0.032em;
    color: color-mix(in oklab, currentColor 88%, var(--primary-color));
` },
            title: { css: dedent`
    --font-size: 1.12rem;
    line-height: 1.24;
    font-weight: 640;
    letter-spacing: -0.018em;
    color: color-mix(in oklab, currentColor 86%, var(--primary-color));
` },
            body: { css: dedent`
    --font-size: 0.96rem;
    line-height: 1.62;
    font-weight: 420;
    letter-spacing: -0.004em;
` },
            label: { css: dedent`
    --font-size: 0.84rem;
    line-height: 1.35;
    font-weight: 620;
    letter-spacing: 0.018em;
` },
        },
        roleVariants: {
            "display.variant": { css: dedent`
    --font-size: 1.08rem;
    line-height: 1.55;
    font-weight: 420;
    letter-spacing: -0.01em;
    color: color-mix(in oklab, currentColor 66%, var(--aperture-muted-color));
` },
            "headline.variant": { css: dedent`
    --font-size: 0.98rem;
    line-height: 1.45;
    font-weight: 520;
    letter-spacing: 0.012em;
    color: color-mix(in oklab, currentColor 68%, var(--aperture-muted-color));
` },
            "title.variant": { css: dedent`
    --font-size: 0.9rem;
    line-height: 1.45;
    font-weight: 480;
    letter-spacing: 0;
    color: color-mix(in oklab, currentColor 64%, var(--aperture-muted-color));
` },
            "body.variant": { css: dedent`
    --font-size: 0.84rem;
    color: color-mix(in oklab, currentColor 62%, var(--aperture-muted-color));
` },
            "label.variant": { css: dedent`
    --font-size: 0.76rem;
    font-weight: 560;
    letter-spacing: 0.028em;
    color: color-mix(in oklab, currentColor 58%, var(--aperture-muted-color));
` },
        },
        sizes: {
            large: { css: "--font-size-multiplier: 1.18;" },
            medium: { css: "--font-size-multiplier: 1;" },
            small: { css: "--font-size-multiplier: 0.86;" },
        },
        raw: [
            { selector: "section > hgroup", css: "padding-bottom: 0.6rem;" },
            { selector: "hgroup > code", css: "font-size: 0.86rem;" },
        ],
    },
    icons: {
        family: "Material Symbols Outlined",
        sizes: {
            medium: "1.25em",
            large: "1.5em",
            xlarge: "2em",
            small: "1em",
        },
    },
    categories: {
        card: {
            variants: {
                elevated: { applyAsDefault: ["&"], css: dedent`
                    background-color: var(--current-color);
                    color: var(--on-current-color);
                    border-color: color-mix(in oklab, var(--on-current-color) 8%, transparent);
                    box-shadow: var(--elevation-1);
                ` },
                flat: { css: dedent`
                    background-color: var(--current-color);
                    color: var(--on-current-color);
                    border-color: color-mix(in oklab, var(--on-current-color) 7%, transparent);
                    box-shadow: none;
                ` },
                outlined: { css: dedent`
                    --current-color: var(--active-color, var(--primary-color));
                    --on-current-color: var(--on-active-color, var(--on-primary-color));
                    background-color: color-mix(in oklab, var(--surface-color) 46%, transparent);
                    color: inherit;
                    border-color: color-mix(in oklab, var(--current-color) 22%, var(--aperture-border-color));
                    box-shadow: none;
                ` },
                tonal: { css: dedent`
                    --current-color: var(--active-color, var(--primary-color));
                    --on-current-color: var(--on-active-color, var(--on-primary-color));
                    background-color: color-mix(in oklab, var(--current-color) 8%, var(--surface-color));
                    color: color-mix(in oklab, var(--current-color) 78%, var(--on-surface-color));
                    border-color: color-mix(in oklab, var(--current-color) 13%, transparent);
                    box-shadow: none;
                ` },
                inset: { css: dedent`
                    background-color: color-mix(in oklab, var(--background-color) 84%, var(--current-color));
                    color: var(--on-background-color);
                    border-color: color-mix(in oklab, var(--on-background-color) 9%, transparent);
                    box-shadow: var(--inset-elevation);
                ` },
                highlighted: { css: dedent`
                    --current-color: var(--active-color, var(--accent-color));
                    --on-current-color: var(--on-active-color, var(--on-accent-color));
                    position: relative;
                    isolation: isolate;
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                    border-color: color-mix(in oklab, var(--current-color) 18%, var(--aperture-border-color));
                    box-shadow: var(--elevation-1);
                `, contexts: { marker: { selector: "&::before", css: dedent`
    content: "";
    position: absolute;
    inset-block: 0.9rem;
    inset-inline-start: 0.9rem;
    width: 0.18rem;
    border-radius: var(--aperture-radius-round);
    background-color: var(--current-color);
` } } },
                text: { css: dedent`
                    background-color: transparent;
                    border-color: transparent;
                    box-shadow: none;
                    color: inherit;
                ` },
                glass: { css: dedent`
                    background-color: var(--aperture-surface-glass);
                    color: var(--on-surface-color);
                    border-color: color-mix(in oklab, var(--surface-color) 46%, var(--aperture-border-color));
                    box-shadow: var(--elevation-2);
                    backdrop-filter: blur(18px) saturate(1.08);
                ` },
                framed: { css: dedent`
                    background:
                        linear-gradient(var(--surface-color), var(--surface-color)) padding-box,
                        linear-gradient(135deg, color-mix(in oklab, var(--primary-color) 32%, transparent), color-mix(in oklab, var(--accent-color) 24%, transparent)) border-box;
                    color: var(--on-surface-color);
                    border-color: transparent;
                    box-shadow:
                        inset 0 0 0 1px color-mix(in oklab, var(--surface-color) 72%, transparent),
                        var(--elevation-1);
                ` },
                quiet: { css: dedent`
                    background-color: color-mix(in oklab, var(--surface-color) 54%, transparent);
                    color: color-mix(in oklab, currentColor 78%, var(--aperture-muted-color));
                    border-color: color-mix(in oklab, currentColor 9%, transparent);
                    box-shadow: none;
                ` },
                focus: { css: dedent`
                    --current-color: var(--active-color, var(--accent-color));
                    --on-current-color: var(--on-active-color, var(--on-accent-color));
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                    border-color: color-mix(in oklab, var(--current-color) 46%, transparent);
                    box-shadow:
                        inset 3px 0 0 var(--current-color),
                        0 0 0 1px color-mix(in oklab, var(--current-color) 12%, transparent),
                        var(--elevation-1);
                ` },
            },
            states: {
                interactive: { css: dedent`
                    translate: 0 -2px;
                    box-shadow: var(--elevation-2);
                ` },
                "interactive-focus": { selector: "&[role=\"button\"]:focus-visible", css: dedent`
                    outline: var(--focus-ring-width) solid color-mix(in oklab, var(--aperture-focus-color) 68%, transparent);
                    outline-offset: var(--focus-ring-offset);
                ` },
                deselected: { css: dedent`
                    opacity: 0.62;
                    filter: saturate(0.76);
                ` },
                selected: { css: dedent`
                    border-color: color-mix(in oklab, var(--active-color, var(--accent-color)) 48%, transparent);
                    box-shadow:
                        0 0 0 1px color-mix(in oklab, var(--active-color, var(--accent-color)) 20%, transparent),
                        var(--elevation-2);
                ` },
            },
            parts: {
                header: { selector: ["> hgroup", "> h3"], css: "color: color-mix(in oklab, var(--active-color, var(--primary-color)) 78%, currentColor);" },
                body: { selector: "> section", css: "color: color-mix(in oklab, currentColor 88%, var(--aperture-surface-muted-color));" },
                footer: { selector: "> footer", css: "color: color-mix(in oklab, currentColor 68%, var(--aperture-muted-color));" },
            },
        },
        button: {
            variants: {
                outlined: { applyAsDefault: ["&"], css: dedent`
                    color: var(--current-color);
                    background-color: color-mix(in oklab, var(--surface-color) 62%, transparent);
                    border-color: color-mix(in oklab, var(--current-color) 34%, var(--aperture-border-color));
                    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--surface-color) 82%, transparent);
                ` },
                flat: { css: dedent`
                    color: var(--on-current-color);
                    background-color: var(--current-color);
                    border-color: color-mix(in oklab, var(--on-current-color) 10%, transparent);
                    box-shadow: none;
                ` },
                elevated: { css: dedent`
                    color: var(--on-current-color);
                    background-color: var(--current-color);
                    border-color: color-mix(in oklab, var(--on-current-color) 12%, transparent);
                    box-shadow: var(--elevation-1);
                ` },
                tonal: { css: dedent`
                    color: color-mix(in oklab, var(--current-color) 86%, var(--on-surface-color));
                    background-color: color-mix(in oklab, var(--current-color) 10%, var(--surface-color));
                    border-color: color-mix(in oklab, var(--current-color) 15%, transparent);
                    box-shadow: none;
                ` },
                text: { css: dedent`
                    padding-inline: 0.45rem;
                    color: var(--current-color);
                    background-color: transparent;
                    border-color: transparent;
                    box-shadow: none;
                ` },
                plain: { css: dedent`
                    color: color-mix(in oklab, currentColor 72%, var(--current-color));
                    background-color: transparent;
                    border-color: transparent;
                    box-shadow: none;
                ` },
                icon: { css: dedent`
                    padding: 0.54rem;
                    aspect-ratio: 1;
                    border-radius: 50%;
                ` },
                quiet: { css: dedent`
                    color: color-mix(in oklab, currentColor 76%, var(--secondary-color));
                    background-color: color-mix(in oklab, var(--surface-color) 48%, transparent);
                    border-color: color-mix(in oklab, currentColor 12%, transparent);
                    box-shadow: none;
                ` },
                focus: { css: dedent`
                    color: var(--current-color);
                    background-color: color-mix(in oklab, var(--current-color) 8%, var(--surface-color));
                    border-color: color-mix(in oklab, var(--accent-color) 62%, transparent);
                    box-shadow:
                        inset 3px 0 0 var(--accent-color),
                        0 0 0 1px color-mix(in oklab, var(--accent-color) 18%, transparent);
                ` },
            },
            states: {
                hover: { css: "translate: 0 -1px;" },
                "hover-muted": { selector: ["&.outlined:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", "&.tonal:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", "&.quiet:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", "&.focus:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", "&:where(:not(.flat):not(.elevated):not(.text):not(.plain)):hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])"], css: dedent`
                    background-color: color-mix(in oklab, var(--current-color) 14%, var(--surface-color));
                    border-color: color-mix(in oklab, var(--current-color) 40%, var(--aperture-border-color));
                ` },
                "hover-filled": { selector: ["&.flat:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", "&.elevated:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])"] , css: "background-color: color-mix(in oklab, var(--on-current-color) 8%, var(--current-color));" },
                "hover-elevated": { selector: "&.elevated:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", css: "box-shadow: var(--elevation-2);" },
                "hover-text": { selector: ["&.text:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])", "&.plain:hover:not(:disabled):not([disabled]):not([aria-disabled=\"true\"])"] , css: dedent`
                    background-color: color-mix(in oklab, var(--current-color) 9%, transparent);
                    box-shadow: none;
                ` },
                focus: { css: dedent`
                    outline: var(--focus-ring-width) solid color-mix(in oklab, var(--aperture-focus-color) 70%, transparent);
                    outline-offset: var(--focus-ring-offset);
                ` },
                active: { css: dedent`
                    background-color: color-mix(in oklab, var(--current-color) 16%, var(--surface-color));
                    border-color: color-mix(in oklab, var(--current-color) 46%, transparent);
                    color: var(--current-color);
                    box-shadow: inset 0 1px 2px color-mix(in oklab, var(--shadow-color) 42%, transparent);
                ` },
            },
        },
        "radio-group": {
            root: { css: dedent`
                display: inline-flex;
                gap: 0;
                border-radius: var(--button-radius);
                background-color: color-mix(in oklab, var(--background-color) 72%, var(--surface-color));
                box-shadow:
                    inset 0 0 0 1px var(--aperture-border-color),
                    var(--inset-elevation);
            ` },
            parts: {
                button: { css: dedent`
                    border-radius: 0;
                    background-color: transparent;
                    border-color: transparent;
                    box-shadow: none;
                    color: color-mix(in oklab, currentColor 70%, var(--secondary-color));
                ` },
                "first-button": { selector: "& > button:first-child", css: dedent`
                    border-start-start-radius: var(--button-radius);
                    border-end-start-radius: var(--button-radius);
                ` },
                "last-button": { selector: "& > button:last-child", css: dedent`
                    border-start-end-radius: var(--button-radius);
                    border-end-end-radius: var(--button-radius);
                ` },
                "selected-button": { css: dedent`
                    background-color: var(--surface-color);
                    color: var(--current-color);
                    box-shadow: var(--elevation-1);
                ` },
            },
        },
        link: {
            root: { css: dedent`
                color: var(--current-color);
                text-decoration-line: underline;
                text-decoration-thickness: 0.07em;
                text-decoration-color: color-mix(in oklab, var(--current-color) 32%, transparent);
            ` },
            states: {
                current: { css: dedent`
                    color: color-mix(in oklab, var(--current-color) 82%, var(--primary-color));
                    font-weight: 640;
                    text-decoration-color: currentColor;
                ` },
                interactive: { css: dedent`
                    color: color-mix(in oklab, var(--current-color) 82%, var(--accent-color));
                    text-decoration-color: currentColor;
                ` },
                focus: { selector: "&:focus-visible", css: dedent`
                    outline: 2px solid color-mix(in oklab, var(--aperture-focus-color) 64%, transparent);
                    outline-offset: 0.18em;
                    border-radius: 0.2em;
                ` },
            },
        },
        "inline-text": {
            parts: {
                code: { css: dedent`
                    padding: 0.16em 0.36em;
                    border-radius: var(--aperture-radius-xs);
                    background-color: color-mix(in oklab, var(--accent-color) 8%, var(--surface-color));
                    color: color-mix(in oklab, var(--primary-color) 82%, var(--accent-color));
                    box-shadow: inset 0 0 0 1px color-mix(in oklab, currentColor 12%, transparent);
                ` },
                "code-focus": { css: dedent`
                    outline: 2px solid color-mix(in oklab, var(--aperture-focus-color) 58%, transparent);
                    outline-offset: 2px;
                ` },
                "list-item": { css: "list-style-type: none;" },
            },
        },
        "text-input": {
            variants: {
                flat: { applyAsDefault: ["&"], css: dedent`
                    background-color: color-mix(in oklab, var(--surface-color) 82%, var(--background-color));
                    color: var(--on-surface-color);
                    border-color: color-mix(in oklab, var(--on-surface-color) 12%, transparent);
                    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--surface-color) 76%, transparent);
                ` },
                outlined: { css: dedent`
                    background-color: transparent;
                    color: inherit;
                    border-color: color-mix(in oklab, var(--current-color) 28%, var(--aperture-border-color));
                    box-shadow: none;
                ` },
                elevated: { css: dedent`
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                    border-color: color-mix(in oklab, var(--on-surface-color) 8%, transparent);
                    box-shadow: var(--elevation-1);
                ` },
                tonal: { css: dedent`
                    background-color: color-mix(in oklab, var(--current-color) 8%, var(--surface-color));
                    color: color-mix(in oklab, var(--current-color) 82%, var(--on-surface-color));
                    border-color: color-mix(in oklab, var(--current-color) 18%, transparent);
                    box-shadow: none;
                ` },
                quiet: { css: dedent`
                    background-color: transparent;
                    color: inherit;
                    border-color: color-mix(in oklab, currentColor 11%, transparent);
                    box-shadow: none;
                ` },
            },
            states: {
                focus: { css: dedent`
                    outline: var(--focus-ring-width) solid color-mix(in oklab, var(--aperture-focus-color) 66%, transparent);
                    outline-offset: var(--focus-ring-offset);
                    border-color: color-mix(in oklab, var(--accent-color) 46%, transparent);
                ` },
                invalid: { css: dedent`
                    border-color: color-mix(in oklab, var(--error-color) 64%, transparent);
                    outline-color: color-mix(in oklab, var(--error-color) 64%, transparent);
                ` },
            },
            parts: {
                "input-shell-control": { css: dedent`
                    border: none;
                    outline: none;
                    padding: 0;
                    background-color: transparent;
                    min-height: 100%;
                    width: 100%;
                    &:focus-visible {
                        outline: none;
                    }
                ` },
                "shell-invalid": { css: dedent`
                    border-color: color-mix(in oklab, var(--error-color) 64%, transparent);
                    outline: 1px solid color-mix(in oklab, var(--error-color) 52%, transparent);
                ` },
                "required-marker": { css: dedent`
                    content: " *";
                    color: var(--error-color);
                    font-weight: 640;
                ` },
            },
        },
        "checkbox-input": {},
        "radio-input": {},
        "range-input": {},
        list: {
            variants: {
                nav: { css: dedent`
                    > li {
                        border-radius: var(--aperture-radius-sm);
                        color: color-mix(in oklab, currentColor 74%, var(--secondary-color));
                        transition: color var(--aperture-duration) var(--aperture-ease), background-color var(--aperture-duration) var(--aperture-ease), box-shadow var(--aperture-duration) var(--aperture-ease);
                    
                        &:not(:has(> *)) { padding: 0.5rem 0.72rem; }
                        > * { display: block; padding: 0.5rem 0.72rem; }
                        &[aria-current="page"], &[aria-selected="true"], &.active, &:has(> [aria-current="page"]), &:has(> [aria-selected="true"]), &:has(> .active) {
                            color: var(--current-color);
                            background-color: color-mix(in oklab, var(--current-color) 10%, var(--surface-color));
                            box-shadow: inset 3px 0 0 var(--current-color);
                        }
                        &:hover:not(.active):not(:has(.active)):not([aria-current="page"]):not(:has(> [aria-current="page"])):not([aria-selected="true"]):not(:has(> [aria-selected="true"])) {
                            color: var(--current-color);
                            background-color: color-mix(in oklab, var(--current-color) 7%, transparent);
                        }
                    }
                ` },
                plain: { css: dedent`
                    > li {
                        border-radius: var(--aperture-radius-sm);
                        border-inline-start: 2px solid color-mix(in oklab, currentColor 14%, transparent);
                        &:not(:has(> *)) { padding: 0.58rem 0.72rem; }
                        > * { display: block; padding: 0.58rem 0.72rem; }
                        &[aria-current="page"], &[aria-selected="true"], &.active, &:has(> [aria-current="page"]), &:has(> [aria-selected="true"]), &:has(> .active) {
                            border-inline-start-color: var(--accent-color);
                            background-color: color-mix(in oklab, var(--accent-color) 7%, var(--surface-color));
                        }
                    }
                ` },
                chips: { css: dedent`
                    > li {
                        --current-color: var(--active-color, var(--primary-color));
                        --on-current-color: var(--on-active-color, var(--on-primary-color));
                        display: inline-flex;
                        align-items: center;
                        padding: 0.24rem 0.52rem;
                        border: 1px solid color-mix(in oklab, var(--current-color) 22%, transparent);
                        border-radius: var(--aperture-radius-round);
                        background-color: color-mix(in oklab, var(--current-color) 8%, var(--surface-color));
                        color: color-mix(in oklab, var(--current-color) 82%, var(--on-surface-color));
                        font-size: 0.78rem;
                        font-weight: 560;
                        line-height: 1.25;
                    }
                ` },
                quiet: { css: "color: color-mix(in oklab, currentColor 68%, var(--aperture-muted-color));" },
            },
        },
        "tab-list": {
            root: { css: dedent`
                --tab-indicator-color: var(--active-color, var(--accent-color));
                color: color-mix(in oklab, currentColor 62%, var(--secondary-color));
                > li {
                    padding: 0.48rem 0.68rem;
                    border-radius: var(--aperture-radius-sm);
                    cursor: pointer;
                    transition: color var(--aperture-duration) var(--aperture-ease), background-color var(--aperture-duration) var(--aperture-ease), box-shadow var(--aperture-duration) var(--aperture-ease);
                    &[aria-selected="true"], &.active, &:has(> [aria-selected="true"]), &:has(> .active) { color: var(--tab-indicator-color); }
                    &:hover:not([aria-selected="true"]):not(.active):not(:has(.active)) {
                        color: var(--current-color);
                        background-color: color-mix(in oklab, var(--current-color) 7%, transparent);
                    }
                }
            ` },
            variants: {
                underlined: { applyAsDefault: ["&"], css: dedent`
                    position: relative;
                    anchor-scope: all;
                    > li {
                        border-radius: 0;
                        &[aria-selected="true"], &.active, &:has(> [aria-selected="true"]), &:has(> .active) { anchor-name: --active; }
                    }
                    &::after {
                        content: "";
                        position: absolute;
                        inset-block-end: 0;
                        height: 2px;
                        background-color: var(--tab-indicator-color);
                        transition: left 180ms var(--aperture-ease), right 180ms var(--aperture-ease);
                        position-anchor: --active;
                        left: anchor(left);
                        right: anchor(right);
                    }
                ` },
                inset: { css: dedent`
                    isolation: isolate;
                    position: relative;
                    display: inline-flex;
                    gap: 0.25rem;
                    padding: 0.25rem;
                    border-radius: var(--aperture-radius-round);
                    background-color: color-mix(in oklab, var(--background-color) 78%, var(--surface-color));
                    box-shadow: var(--inset-elevation);
                    anchor-scope: all;
                    > li {
                        border-radius: var(--aperture-radius-round);
                        &[aria-selected="true"], &.active, &:has(> [aria-selected="true"]), &:has(> .active) { anchor-name: --active; }
                    }
                    &::after {
                        content: "";
                        position: absolute;
                        z-index: -1;
                        background-color: var(--surface-color);
                        border-radius: var(--aperture-radius-round);
                        box-shadow: var(--elevation-1);
                        transition: left 180ms var(--aperture-ease), right 180ms var(--aperture-ease);
                        position-anchor: --active;
                        left: anchor(left); right: anchor(right); top: anchor(top); bottom: anchor(bottom);
                    }
                ` },
                framed: { css: dedent`
                    border: 1px solid var(--aperture-border-color);
                    border-radius: var(--aperture-radius-md);
                    background-color: color-mix(in oklab, var(--surface-color) 72%, transparent);
                    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--surface-color) 64%, transparent);
                    > li {
                        border-radius: var(--aperture-radius-sm);
                        &[aria-selected="true"], &.active, &:has(> [aria-selected="true"]), &:has(> .active) {
                            background-color: var(--surface-color);
                            box-shadow: inset 0 -2px 0 var(--tab-indicator-color);
                        }
                    }
                ` },
            },
        },
        "menu-list": {
            root: { css: dedent`
                list-style: none;
                border: 1px solid var(--aperture-border-color);
                border-radius: var(--menu-radius);
                background-color: var(--surface-color);
                color: var(--on-surface-color);
                box-shadow: var(--elevation-2);
                &:not(:has(> *)) { padding: 0.5rem 0.65rem; }
            ` },
            variants: {
                menu: { applyAsDefault: ["&"] },
                glass: { css: dedent`
                    background-color: var(--aperture-surface-glass);
                    backdrop-filter: blur(16px) saturate(1.06);
                ` },
            },
            parts: {
                item: { css: dedent`
                    display: block;
                    padding: 0.58rem 0.72rem;
                    border-radius: var(--aperture-radius-sm);
                    cursor: pointer;
                    &:hover,
                    &[aria-selected="true"],
                    &[aria-current="page"],
                    &.active {
                        background-color: color-mix(in oklab, var(--current-color) 9%, transparent);
                        color: var(--current-color);
                    }
                ` },
            },
        },
        navigation: {
            root: { css: "color: color-mix(in oklab, currentColor 82%, var(--secondary-color));" },
            variants: {
                top: { css: dedent`
                    background-color: color-mix(in oklab, var(--surface-color) 88%, transparent);
                    color: var(--on-surface-color);
                    border-bottom: 1px solid var(--aperture-border-color);
                    box-shadow: 0 1px 0 color-mix(in oklab, var(--surface-color) 70%, transparent);
                ` },
                pageNav: { applyAsDefault: ["aside > &"], css: dedent`
                    background-color: color-mix(in oklab, var(--surface-color) 48%, transparent);
                    color: var(--on-surface-color);
                    border: 1px solid color-mix(in oklab, var(--on-surface-color) 9%, transparent);
                    border-radius: var(--aperture-radius-md);
                ` },
                glass: { css: dedent`
                    background-color: var(--aperture-surface-glass);
                    border-color: color-mix(in oklab, var(--surface-color) 42%, var(--aperture-border-color));
                    backdrop-filter: blur(18px) saturate(1.06);
                ` },
                quiet: { css: dedent`
                    background-color: transparent;
                    border-color: transparent;
                    box-shadow: none;
                ` },
            },
            states: {
                "current-link": { css: dedent`
                    color: var(--active-color, var(--accent-color));
                    font-weight: 650;
                    text-decoration-color: currentColor;
                ` },
            },
        },
        breadcrumb: {
            root: { css: "color: color-mix(in oklab, currentColor 60%, var(--aperture-muted-color));" },
            parts: {
                track: { css: dedent`
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                ` },
                item: { css: dedent`
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                ` },
                separator: { css: dedent`
                    content: "/";
                    color: color-mix(in oklab, currentColor 42%, transparent);
                ` },
            },
        },
        popover: {
            root: { css: dedent`
                border: 1px solid var(--aperture-border-color);
                border-radius: var(--menu-radius);
                background-color: var(--surface-color);
                color: var(--on-surface-color);
                box-shadow: var(--elevation-3);
            ` },
            variants: {
                menu: { applyAsDefault: ["&"] },
                glass: { css: dedent`
                    background-color: var(--aperture-surface-glass);
                    border-color: color-mix(in oklab, var(--surface-color) 45%, var(--aperture-border-color));
                    backdrop-filter: blur(18px) saturate(1.08);
                ` },
                framed: { css: dedent`
                    border-color: color-mix(in oklab, var(--accent-color) 28%, var(--aperture-border-color));
                    box-shadow:
                        inset 0 0 0 1px color-mix(in oklab, var(--surface-color) 64%, transparent),
                        var(--elevation-3);
                ` },
            },
        },
        dialog: {
            root: { css: dedent`
                border: 1px solid var(--aperture-border-color);
                border-radius: var(--dialog-radius);
                background-color: var(--current-color);
                color: var(--on-current-color);
                box-shadow: var(--elevation-3);
            ` },
            variants: {
                glass: { css: dedent`
                    background-color: var(--aperture-surface-glass);
                    border-color: color-mix(in oklab, var(--surface-color) 45%, var(--aperture-border-color));
                    backdrop-filter: blur(20px) saturate(1.06);
                ` },
                framed: { css: dedent`
                    border-color: color-mix(in oklab, var(--accent-color) 26%, var(--aperture-border-color));
                    box-shadow:
                        inset 0 0 0 1px color-mix(in oklab, var(--surface-color) 62%, transparent),
                        var(--elevation-3);
                ` },
            },
            parts: {
                backdrop: { css: dedent`
                    background-color: color-mix(in oklab, var(--background-color) 54%, black 32%);
                    backdrop-filter: blur(3px);
                ` },
                footer: { css: dedent`
                    display: flex;
                    gap: 0.55rem;
                    border-top: 1px solid color-mix(in oklab, currentColor 10%, transparent);
                    color: color-mix(in oklab, currentColor 76%, var(--aperture-muted-color));
                ` },
                "form-footer": { css: "color: color-mix(in oklab, currentColor 72%, var(--aperture-muted-color));" },
            },
        },
        "empty-state-skeleton": {
            states: {
                busy: { css: dedent`
                    animation: aperture-shimmer 1.4s linear infinite;
                    background-size: 200% 100%;
                    background-image: linear-gradient(
                        90deg,
                        color-mix(in oklab, currentColor 7%, var(--surface-color)) 25%,
                        color-mix(in oklab, currentColor 13%, var(--surface-color)) 37%,
                        color-mix(in oklab, currentColor 7%, var(--surface-color)) 63%
                    );
                ` },
                "not-busy": { css: "background-color: color-mix(in oklab, currentColor 9%, var(--surface-color));" },
            },
            parts: {
                "skeleton-block": { css: dedent`
                    pointer-events: none;
                    user-select: none;
                    border-radius: var(--aperture-radius-xs);
                    color: transparent;
                ` },
            },
        },
        "empty-state-empty": {
            root: { css: dedent`
                --current-color: var(--active-color, var(--surface-color));
                --on-current-color: var(--on-active-color, var(--on-surface-color));
                isolation: isolate;
                position: relative;
                padding: 1.25rem;
                border: 1px dashed color-mix(in oklab, var(--accent-color) 28%, var(--aperture-border-color));
                border-radius: var(--card-radius);
                background-color: color-mix(in oklab, var(--current-color) 78%, transparent);
                color: var(--on-current-color);
                box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--surface-color) 58%, transparent);
            ` },
            variants: {
                framed: { css: dedent`
                    border-style: solid;
                    border-color: color-mix(in oklab, var(--accent-color) 34%, var(--aperture-border-color));
                    box-shadow: var(--elevation-1);
                ` },
            },
            parts: {
                "empty-decoration": { css: dedent`
                    content: "";
                    position: absolute;
                    pointer-events: none;
                    inset: 0.55rem;
                    border: 1px solid color-mix(in oklab, var(--accent-color) 10%, transparent);
                    border-radius: calc(var(--card-radius) - 0.35rem);
                ` },
            },
        },
        icon: {
            variants: {
                small: { css: "font-variation-settings: \"FILL\" 0, \"wght\" 420, \"GRAD\" -25, \"opsz\" 20;" },
                medium: { applyAsDefault: ["&"] },
                large: { css: "font-variation-settings: \"FILL\" 0, \"wght\" 400, \"GRAD\" -25, \"opsz\" 32;" },
                xlarge: { css: "font-variation-settings: \"FILL\" 0, \"wght\" 380, \"GRAD\" -25, \"opsz\" 40;" },
            },
        },
    },
    appDefaults: [
        {
            selector: "@keyframes aperture-shimmer",
            scoped: false,
            css: dedent`
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            `,
        },
        {
            selector: ".aperture",
            scoped: false,
            css: dedent`
                --aperture-radius-xs: 0.35rem;
                --aperture-radius-sm: 0.55rem;
                --aperture-radius-md: 0.8rem;
                --aperture-radius-lg: 1.05rem;
                --aperture-radius-xl: 1.35rem;
                --aperture-radius-round: 999px;
                --button-radius: var(--aperture-radius-sm);
                --input-radius: var(--aperture-radius-sm);
                --card-radius: var(--aperture-radius-lg);
                --menu-radius: var(--aperture-radius-md);
                --dialog-radius: var(--aperture-radius-xl);
                --focus-ring-width: 2px;
                --focus-ring-offset: 2px;
                --font-family: Inter, Geist, "Avenir Next", "IBM Plex Sans", "Source Sans 3", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                --mono-font-family: "Cascadia Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                --aperture-ease: ease-out;
                --aperture-duration: 160ms;
                --aperture-border-color: color-mix(in oklab, var(--on-surface-color) 13%, transparent);
                --aperture-border-strong-color: color-mix(in oklab, var(--primary-color) 28%, var(--aperture-border-color));
                --aperture-muted-color: color-mix(in oklab, var(--on-background-color) 62%, var(--background-color));
                --aperture-surface-muted-color: color-mix(in oklab, var(--on-surface-color) 60%, var(--surface-color));
                --aperture-surface-soft: color-mix(in oklab, var(--surface-color) 84%, var(--background-color));
                --aperture-surface-glass: color-mix(in oklab, var(--surface-color) 78%, transparent);
                --aperture-focus-color: color-mix(in oklab, var(--accent-color) 72%, var(--primary-color));
                --aperture-tonal-surface: color-mix(in oklab, var(--active-color, var(--accent-color)) 9%, var(--surface-color));
                --elevation-1:
                    0 1px 2px color-mix(in oklab, var(--shadow-color) 46%, transparent),
                    0 8px 22px -18px var(--shadow-color);
                --elevation-2:
                    0 4px 10px -8px var(--shadow-color),
                    0 16px 36px -28px var(--shadow-color);
                --elevation-3:
                    0 12px 24px -18px var(--shadow-color),
                    0 28px 58px -38px var(--shadow-color);
                --inset-elevation:
                    inset 0 1px 2px color-mix(in oklab, var(--shadow-color) 42%, transparent),
                    inset 0 12px 28px -28px var(--primary-color);
                accent-color: var(--accent-color);
            `,
        },
        {
            selector: ["html", "body", "#app", ".aperture"],
            scoped: false,
            css: dedent`
                background: var(--background-color);
                color: var(--on-background-color);
            `,
        },
        {
            selector: ["#app.aperture", ".aperture #app"],
            scoped: false,
            css: "color: var(--on-background-color);",
        },
    ],
} as const satisfies LinsThemeDefinition);

export default apertureThemeInfo;
