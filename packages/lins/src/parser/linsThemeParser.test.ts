import { describe, expect, test } from "vitest";
import { defineLinsTheme } from "../generator";
import { parseLinsStylesheet } from "./linsThemeParser.ts";

const parserFixtureTheme = defineLinsTheme({
    id: "parser-fixture",
    name: "Parser Fixture",
    className: "parserFixtureTheme",
    optOutClassName: "notParserFixtureTheme",
    description: "Theme fixture used to define the parser round-trip contract.",
    stylesheets: ["button", "text", "icon"],
    colorThemes: [
        {
            id: "light",
            name: "Light",
            className: "light",
            colorScheme: "light",
            description: "Light parser fixture palette.",
            before: "/* before light palette */",
            after: "/* after light palette */",
            colors: {
                primary: ["oklch(55% 0.22 260)", "white"],
                accent: { color: "oklch(68% 0.16 175)", onColor: "black" },
                surface: "oklch(99% 0.01 260)",
                customBrand: ["rebeccapurple", "white"],
            },
            tokens: {
                "--shadow-color": "oklab(0 0 0 / 0.2)",
                "--focus-ring-color": "var(--accent-color)",
            },
        },
        {
            id: "dark",
            name: "Dark",
            className: "dark",
            colorScheme: "dark",
            colors: {
                primary: ["oklch(78% 0.15 260)", "black"],
                background: ["oklch(18% 0.02 260)", "white"],
            },
            tokens: {
                "--shadow-color": "oklab(0 0 0 / 0.55)",
            },
        },
    ],
    icons: {
        family: "'Material Symbols Outlined'",
        fontFaceCss: "@font-face { font-family: 'Material Symbols Outlined'; src: url('/icons.woff2') format('woff2'); }",
        sizes: {
            small: "1rem",
            medium: "1.25rem",
            xlarge: "2rem",
        },
        css: {
            css: "font-variation-settings: 'FILL' 0, 'wght' 400;",
        },
    },
    typography: {
        defaults: {
            css: "--base-font-size: 1rem;\nfont-family: Inter, system-ui, sans-serif;",
        },
        roles: {
            body: {
                css: "--font-size: var(--base-font-size);\nline-height: 1.55;",
            },
            label: {
                css: "--font-size: 0.875rem;\nfont-weight: 650;",
            },
        },
        roleVariants: {
            "body.variant": {
                css: "color: color-mix(in oklab, currentColor 65%, transparent);",
            },
        },
        sizes: {
            small: {
                css: "--font-size-multiplier: 0.875;",
            },
            medium: {
                css: "--font-size-multiplier: 1;",
            },
        },
        raw: [
            {
                selector: "abbr[title]",
                css: "text-decoration-color: var(--accent-color);",
            },
        ],
    },
    categories: {
        button: {
            root: {
                css: "--current-color: var(--active-color, var(--primary-color));\n--on-current-color: var(--on-active-color, var(--on-primary-color));\nborder-radius: 999px;",
            },
            variants: {
                flat: {
                    applyAsDefault: ["&"],
                    css: "background: var(--current-color);\ncolor: var(--on-current-color);",
                },
                outlined: {
                    css: "background: transparent;\nborder: 1px solid var(--current-color);\ncolor: var(--current-color);",
                },
                icon: {
                    selectors: ["&.icon", "&[data-icon]"],
                    css: "aspect-ratio: 1;\npadding-inline: 0.6em;",
                    contexts: {
                        badge: {
                            selector: "& > .badge",
                            css: "background: var(--error-color);\ncolor: var(--on-error-color);",
                        },
                    },
                },
                tonal: {
                    applyAsDefault: ["&[data-soft]"],
                    css: "background: color-mix(in oklab, var(--current-color) 14%, transparent);",
                },
            },
            states: {
                hover: {
                    css: "filter: brightness(1.05);",
                },
                focus: {
                    css: "outline: 2px solid var(--focus-ring-color);\noutline-offset: 2px;",
                },
            },
            raw: [
                {
                    selector: "&::-moz-focus-inner",
                    css: "border: 0;",
                },
            ],
        },
        "radio-group": {
            root: {
                css: "border: 1px solid var(--primary-color);",
            },
            parts: {
                button: {
                    css: "border-radius: 0;",
                },
                "selected-button": {
                    css: "background: var(--primary-color);\ncolor: var(--on-primary-color);",
                },
            },
        },
        link: {
            root: {
                css: "color: var(--active-color, var(--accent-color));",
            },
            states: {
                current: {
                    css: "font-weight: 700;",
                },
            },
        },
        "custom-chip": {
            stylesheetId: "button",
            selectors: ["chip-token"],
            root: {
                css: "border: 1px solid currentColor;",
            },
        },
    },
    appDefaults: [
        {
            selector: "main :focus-visible",
            css: "outline-color: var(--focus-ring-color);",
        },
        {
            selector: "@media (prefers-reduced-motion: reduce)",
            scoped: false,
            css: "* { transition-duration: 0.01ms; }",
        },
    ],
});

const parserFixtureMetadata = {
    id: parserFixtureTheme.id,
    name: parserFixtureTheme.name,
    className: parserFixtureTheme.className,
    optOutClassName: parserFixtureTheme.optOutClassName,
    description: parserFixtureTheme.description,
    stylesheets: parserFixtureTheme.stylesheets,
};

describe("parseLinsStylesheet", () => {
    test.fails("round-trips the root theme stylesheet generated by createThemeStylesheet", () => {
        const css = parserFixtureTheme.createThemeStylesheet();

        const parsed = parseLinsStylesheet(css, {
            sourceId: "theme.css",
            theme: parserFixtureMetadata,
        });

        expect(parsed.warnings).toEqual([]);
        expect(parsed.definition).toMatchObject({
            ...parserFixtureMetadata,
            colorThemes: parserFixtureTheme.colorThemes,
            icons: {
                family: parserFixtureTheme.icons?.family,
                css: parserFixtureTheme.icons?.css,
            },
            typography: {
                defaults: parserFixtureTheme.typography?.defaults,
            },
            appDefaults: parserFixtureTheme.appDefaults,
        });
    });

    test.fails("round-trips an element stylesheet generated by createStylesheet", () => {
        const css = parserFixtureTheme.createStylesheet("button");

        const parsed = parseLinsStylesheet(css, {
            sourceId: "button.css",
            stylesheetId: "button",
            theme: parserFixtureMetadata,
        });

        expect(parsed.warnings).toEqual([]);
        expect(parsed.definition.categories).toMatchObject({
            button: parserFixtureTheme.categories?.button,
            "radio-group": parserFixtureTheme.categories?.["radio-group"],
            link: parserFixtureTheme.categories?.link,
            "custom-chip": parserFixtureTheme.categories?.["custom-chip"],
        });
    });

    test.fails("round-trips typography rules generated in the text stylesheet", () => {
        const css = parserFixtureTheme.createStylesheet("text");

        const parsed = parseLinsStylesheet(css, {
            sourceId: "text.css",
            stylesheetId: "text",
            theme: parserFixtureMetadata,
        });

        expect(parsed.warnings).toEqual([]);
        expect(parsed.definition.typography).toMatchObject({
            roles: parserFixtureTheme.typography?.roles,
            roleVariants: parserFixtureTheme.typography?.roleVariants,
            sizes: parserFixtureTheme.typography?.sizes,
            raw: parserFixtureTheme.typography?.raw,
        });
    });

    test.fails("round-trips icon size rules generated in the icon stylesheet", () => {
        const css = parserFixtureTheme.createStylesheet("icon");

        const parsed = parseLinsStylesheet(css, {
            sourceId: "icon.css",
            stylesheetId: "icon",
            theme: parserFixtureMetadata,
        });

        expect(parsed.warnings).toEqual([]);
        expect(parsed.definition.icons).toMatchObject({
            sizes: parserFixtureTheme.icons?.sizes,
        });
    });

    test.fails("warns for non-LINS CSS while recovering parseable generated rules", () => {
        const css = `${parserFixtureTheme.createStylesheet("button")}\n\n@layer utilities {\n    .grid { display: grid; }\n}\n\n@layer elements {\n    .marketing-callout {\n        color: hotpink;\n    }\n}`;

        const parsed = parseLinsStylesheet(css, {
            sourceId: "button-with-extra-css.css",
            stylesheetId: "button",
            theme: parserFixtureMetadata,
        });

        expect(parsed.warnings).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: "unknown-layer" }),
            expect.objectContaining({ code: "unknown-selector", selector: ".marketing-callout" }),
        ]));
        expect(parsed.definition.categories).toMatchObject({
            button: parserFixtureTheme.categories?.button,
            "radio-group": parserFixtureTheme.categories?.["radio-group"],
            link: parserFixtureTheme.categories?.link,
            "custom-chip": parserFixtureTheme.categories?.["custom-chip"],
        });
    });
});

