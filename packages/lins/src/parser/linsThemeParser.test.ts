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

// A small, focused theme used by the warning-fixture tests below (§7/§8 of
// PARSER_SPEC.md). Kept intentionally minimal so each fixture's hand-edited
// drift is easy to reason about against a known-clean baseline.
const warningFixtureTheme = defineLinsTheme({
    id: "warning-fixture",
    name: "Warning Fixture",
    className: "warningFixtureTheme",
    stylesheets: ["button", "text", "icon"],
    colorThemes: [
        {
            id: "light",
            name: "Light",
            className: "light",
            colorScheme: "light",
            colors: {
                primary: "oklch(50% 0.2 260)",
                accent: "oklch(60% 0.2 200)",
            },
        },
    ],
    icons: {
        family: "'Material Symbols Outlined'",
        sizes: {
            small: "1rem",
        },
    },
    typography: {
        roles: {
            body: {
                css: "font-size: 1rem;",
            },
        },
    },
    categories: {
        button: {
            root: {
                css: "border-radius: 4px;",
            },
            variants: {
                flat: {
                    applyAsDefault: ["&"],
                    css: "background: red;",
                },
                outlined: {
                    css: "background: transparent;",
                },
            },
            states: {
                hover: {
                    css: "opacity: 0.9;",
                },
            },
        },
    },
});

const warningFixtureMetadata = {
    id: warningFixtureTheme.id,
    name: warningFixtureTheme.name,
    className: warningFixtureTheme.className,
    stylesheets: warningFixtureTheme.stylesheets,
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

// ---------------------------------------------------------------------------
// §7/§8 warning-taxonomy fixtures. Each test targets one warning code with a
// small, single-purpose fixture per the testing strategy in PARSER_SPEC.md §9.
// ---------------------------------------------------------------------------

describe("parseLinsStylesheet warnings", () => {
    describe("structural at-rule / layer / scope warnings (§6.2, §6.3, §8.3)", () => {
        test.fails("emits unknown-at-rule for an unrecognized top-level at-rule, still parsing its contents", () => {
            const css = `${warningFixtureTheme.createStylesheet("button")}\n\n@container (min-width: 40rem) {\n    button {\n        gap: 0.5rem;\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unknown-at-rule", atRule: expect.stringContaining("@container") }),
            ]));
            expect(parsed.definition.categories?.button).toMatchObject(warningFixtureTheme.categories!.button!);
        });

        test.fails("emits unknown-layer for a non-LINS @layer and does not walk its contents", () => {
            const css = `${warningFixtureTheme.createStylesheet("button")}\n\n@layer utilities {\n    .stack { display: flex; }\n    .row { display: flex; }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            const unknownLayerWarnings = parsed.warnings.filter((warning) => warning.code === "unknown-layer");
            expect(unknownLayerWarnings).toHaveLength(1);
            expect(parsed.warnings).not.toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unknown-selector", selector: ".stack" }),
                expect.objectContaining({ code: "unknown-selector", selector: ".row" }),
            ]));
        });

        test.fails("emits unknown-scope when the @scope wrapper is missing entirely (§8.3)", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(/@scope \([^)]*\) to \([^)]*\) \{\n?/, "").replace(/\n\}\s*$/, "\n");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unknown-scope" }),
            ]));
            expect(parsed.definition.categories?.button).toMatchObject(warningFixtureTheme.categories!.button!);
        });

        test.fails("emits unknown-scope for opt-out class drift and opt-out-class-mismatch when theme metadata disagrees (§8.5)", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace("notWarningFixtureTheme", "notWarningFixtureThemeActual");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: { ...warningFixtureMetadata, optOutClassName: "notWarningFixtureTheme" },
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "opt-out-class-mismatch" }),
            ]));
        });

        test.fails("emits unknown-at-rule for a misplaced @layer defaults in an element stylesheet without typography (§8.3)", () => {
            const css = `@layer defaults {\n    :root {\n        --stray: 1;\n    }\n}\n\n${warningFixtureTheme.createStylesheet("button")}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unknown-at-rule", atRule: expect.stringContaining("@layer defaults") }),
            ]));
        });
    });

    describe("malformed / unsupported content (§6.4)", () => {
        test.fails("emits malformed-rule for unparseable CSS and continues parsing subsequent rules", () => {
            const css = `button {\n    background: red;\n\n${warningFixtureTheme.createStylesheet("button")}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "malformed-rule" }),
            ]));
        });

        test.fails("emits unsupported-declaration for a structurally-invalid color-scheme value, keeping the raw text", () => {
            const css = warningFixtureTheme.createThemeStylesheet().replace("color-scheme: light;", "color-scheme: banana;");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unsupported-declaration", css: expect.stringContaining("color-scheme: banana;") }),
            ]));
        });

        test.fails("emits unknown-selector for a one-off foreign rule and preserves it as a scoped appDefaults entry", () => {
            const css = `${warningFixtureTheme.createStylesheet("button")}\n\n@layer elements {\n    @scope (.warningFixtureTheme) to (.notWarningFixtureTheme) {\n        .marketing-callout {\n            color: hotpink;\n        }\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unknown-selector", selector: ".marketing-callout" }),
            ]));
            expect(parsed.definition.appDefaults).toEqual(expect.arrayContaining([
                expect.objectContaining({ selector: ".marketing-callout", css: expect.stringContaining("color: hotpink;") }),
            ]));
        });
    });

    describe("category matching drift (§4.1, §8.1, §8.2)", () => {
        test.fails("emits partial-category-selectors when only a subset of the button selector list is present", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(
                /button, input\[type=button], input\[type=submit], input\[type=reset], input\[type=image], \[role="button"]:not\(article\)/,
                "button",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "partial-category-selectors" }),
            ]));
            expect(parsed.definition.categories?.button).toMatchObject(warningFixtureTheme.categories!.button!);
        });

        test.fails("emits ambiguous-selector-superset when a category rule includes an extra, unexplained selector", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(
                '[role="button"]:not(article) {',
                '[role="button"]:not(article),\n.brand-button {',
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "ambiguous-selector-superset" }),
            ]));
            expect(parsed.definition.categories?.button).toMatchObject(warningFixtureTheme.categories!.button!);
        });

        test.fails("emits ambiguous-category-match when a rule's selectors overlap two known categories", () => {
            const css = `@layer elements {\n    @scope (.warningFixtureTheme) to (.notWarningFixtureTheme) {\n        button,\n        a {\n            border-radius: 4px;\n        }\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "ambiguous-category-match" }),
            ]));
        });

        test.fails("emits duplicate-category-definition and merges bodies (later wins) when a category is defined twice", () => {
            const css = `@layer elements {\n    @scope (.warningFixtureTheme) to (.notWarningFixtureTheme) {\n        button, input[type=button], input[type=submit], input[type=reset], input[type=image], [role="button"]:not(article) {\n            border-radius: 4px;\n        }\n\n        button, input[type=button], input[type=submit], input[type=reset], input[type=image], [role="button"]:not(article) {\n            border-radius: 999px;\n        }\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "duplicate-category-definition" }),
            ]));
            expect(parsed.definition.categories?.button?.root?.css).toContain("border-radius: 999px;");
        });

        test.fails("merges a category hand-split across two rules and flags split-category-rule (§8.2)", () => {
            const css = `@layer elements {\n    @scope (.warningFixtureTheme) to (.notWarningFixtureTheme) {\n        button {\n            border-radius: 4px;\n        }\n\n        input[type=button] {\n            border-radius: 4px;\n        }\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "partial-category-selectors" }),
            ]));
            expect(parsed.definition.categories?.button?.root?.css).toContain("border-radius: 4px;");
        });

        test.fails("captures a structurally category-like rule with no spec overlap as unrecognized-category", () => {
            const css = `${warningFixtureTheme.createStylesheet("button")}\n\n@layer elements {\n    @scope (.warningFixtureTheme) to (.notWarningFixtureTheme) {\n        chip-token {\n            border: 1px solid currentColor;\n\n            &.selected {\n                font-weight: 700;\n            }\n        }\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unrecognized-category" }),
            ]));
            expect(parsed.definition.categories).toMatchObject({
                "chip-token": {
                    stylesheetId: "button",
                    selectors: ["chip-token"],
                    root: { css: expect.stringContaining("border: 1px solid currentColor;") },
                },
            });
        });

        test.fails("emits empty-rule-body for a matched category rule with no declarations or nested rules", () => {
            const css = `@layer elements {\n    @scope (.warningFixtureTheme) to (.notWarningFixtureTheme) {\n        button, input[type=button], input[type=submit], input[type=reset], input[type=image], [role="button"]:not(article) {\n        }\n    }\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "empty-rule-body" }),
            ]));
        });
    });

    describe("variant, state, and part matching drift (§4.2, §4.3)", () => {
        test.fails("emits selector-drift when a state's :not() exclusion list is narrower than the spec default", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(
                "&:hover:not(:disabled):not([disabled])",
                "&:hover:not(:disabled)",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "selector-drift", selector: expect.stringContaining("&:hover:not(:disabled)") }),
            ]));
            expect(parsed.definition.categories?.button?.states?.hover).toMatchObject({
                css: warningFixtureTheme.categories!.button!.states!.hover!.css,
            });
        });

        test.fails("emits custom-part-inferred for a nested rule that matches no known state/part slot", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(
                "&:hover:not(:disabled):not([disabled]) {\n        opacity: 0.9;\n    }",
                "&:hover:not(:disabled):not([disabled]) {\n        opacity: 0.9;\n    }\n\n    &.loading {\n        cursor: wait;\n    }",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "custom-part-inferred" }),
            ]));
            expect(parsed.definition.categories?.button?.parts?.loading).toMatchObject({ css: "cursor: wait;" });
        });

        test.fails("emits inferred-variant-id for a variant rule with no &.<class> selector", () => {
            // Hand-authored variant that only carries a data-attribute selector, so
            // the parser cannot recover a className and must infer variantId.
            const finalCss = `${warningFixtureTheme.createStylesheet("button").replace(/\n\}\s*$/, "\n")}\n\n    &[data-icon] {\n        aspect-ratio: 1;\n    }\n}`;

            const parsed = parseLinsStylesheet(finalCss, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "inferred-variant-id" }),
            ]));
        });

        test.fails("emits unnamed-variant when a nested rule only declares :where(...) default selectors", () => {
            const finalCss = `${warningFixtureTheme.createStylesheet("button").replace(/\n\}\s*$/, "\n")}\n\n    :where(&[data-soft]) {\n        opacity: 0.85;\n    }\n}`;

            const parsed = parseLinsStylesheet(finalCss, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unnamed-variant" }),
            ]));
        });

        test.fails("emits stale-default-exclusion when the :where(&:not(...)) chain doesn't match sibling variants", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(
                ":where(&:not(.outlined)) {",
                ":where(&:not(.outlined):not(.tonal)) {",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "stale-default-exclusion" }),
            ]));
            expect(parsed.definition.categories?.button?.variants?.flat).toMatchObject({ applyAsDefault: ["&"] });
        });
    });

    describe("typography and icon drift (§4.5)", () => {
        test.fails("emits partial-typography-defaults when a role's :where(...) selector list is narrower than spec", () => {
            const css = warningFixtureTheme.createStylesheet("text").replace(
                /:where\(p, dt, dd[^)]*\)/,
                ":where(p, dt, dd)",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "text.css",
                stylesheetId: "text",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "partial-typography-defaults" }),
            ]));
            expect(parsed.definition.typography?.roles?.body).toMatchObject({ css: "font-size: 1rem;" });
        });

        test.fails("emits extra-typography-defaults when a role's :where(...) selector list has extra selectors", () => {
            const cssWithExtraDefault = warningFixtureTheme.createStylesheet("text").replace(
                /(:where\([^)]*)\)/,
                "$1, .extra-selector)",
            );

            const parsed = parseLinsStylesheet(cssWithExtraDefault, {
                sourceId: "text.css",
                stylesheetId: "text",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "extra-typography-defaults" }),
            ]));
        });

        test.fails("treats a bare .variant rule with no role class as typography raw with unknown-selector (§8.4)", () => {
            const css = `${warningFixtureTheme.createStylesheet("text")}\n\n.variant {\n    opacity: 0.8;\n}`;

            const parsed = parseLinsStylesheet(css, {
                sourceId: "text.css",
                stylesheetId: "text",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unknown-selector", selector: ".variant" }),
            ]));
        });

        test.fails("emits unrecognized-icon-size for a custom icon size class, still capturing its value", () => {
            const customIconTheme = defineLinsTheme({
                ...warningFixtureTheme,
                icons: { ...warningFixtureTheme.icons, sizes: { ...warningFixtureTheme.icons?.sizes, tiny: "0.6rem" } },
            });
            const css = customIconTheme.createStylesheet("icon");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "icon.css",
                stylesheetId: "icon",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unrecognized-icon-size" }),
            ]));
            expect(parsed.definition.icons?.sizes).toMatchObject({ tiny: "0.6rem" });
        });

        test.fails("emits unsupported-icon-declaration when an icon-size rule has extra declarations", () => {
            const css = warningFixtureTheme.createStylesheet("icon").replace(
                "font-size: 1rem;",
                "font-size: 1rem;\n    color: red;",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "icon.css",
                stylesheetId: "icon",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unsupported-icon-declaration" }),
            ]));
            expect(parsed.definition.icons?.sizes).toMatchObject({ small: "1rem" });
        });
    });

    describe("theme-root and color-role recovery (§5, §4.5, §8.5)", () => {
        test.fails("emits stylesheet-list-mismatch when @import lines disagree with theme.stylesheets", () => {
            const css = warningFixtureTheme.createThemeStylesheet();

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: { ...warningFixtureMetadata, stylesheets: ["button", "text", "icon", "card"] },
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "stylesheet-list-mismatch" }),
            ]));
            expect(parsed.definition.stylesheets).toEqual(["button", "text", "icon"]);
        });

        test.fails("emits missing-color-scheme-declaration and defaults colorScheme to light when it's absent", () => {
            const css = warningFixtureTheme.createThemeStylesheet().replace("color-scheme: light;\n", "");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "missing-color-scheme-declaration" }),
            ]));
            expect(parsed.definition.colorThemes?.[0]).toMatchObject({ colorScheme: "light" });
        });

        test.fails("emits unrecognized-color-role for a custom color role not present in the spec", () => {
            const customRoleTheme = defineLinsTheme({
                ...warningFixtureTheme,
                colorThemes: [
                    {
                        id: "light",
                        className: "light",
                        colorScheme: "light" as const,
                        colors: { ...warningFixtureTheme.colorThemes[0]!.colors, customBrand: "rebeccapurple" },
                    },
                ],
            });
            const css = customRoleTheme.createThemeStylesheet();

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unrecognized-color-role" }),
            ]));
            expect(parsed.definition.colorThemes?.[0]?.colors).toMatchObject({ customBrand: "rebeccapurple" });
        });

        test.fails("emits ambiguous-theme-root-declaration for unclassifiable content in the theme root rule (§5.1)", () => {
            const ambiguousTheme = defineLinsTheme({
                ...warningFixtureTheme,
                typography: { defaults: { css: "--mystery-token: 1;" } },
            });
            const css = ambiguousTheme.createThemeStylesheet();

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "ambiguous-theme-root-declaration" }),
            ]));
            expect(parsed.definition.typography?.defaults).toMatchObject({ css: expect.stringContaining("--mystery-token: 1;") });
        });

        test.fails("emits unrecognized-theme-root-declaration for content that can't be attributed to icons or typography", () => {
            const css = warningFixtureTheme.createThemeStylesheet().replace(
                ".warningFixtureTheme {",
                ".warningFixtureTheme {\n    unknown-custom-thing: 1;",
            );

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "unrecognized-theme-root-declaration" }),
            ]));
            expect(parsed.definition.appDefaults).toEqual(expect.arrayContaining([
                expect.objectContaining({ selector: ".warningFixtureTheme", css: expect.stringContaining("unknown-custom-thing: 1;") }),
            ]));
        });

        test.fails("requires no warning for zero colorThemes entries, still recovering color-role aliases (§8.5)", () => {
            const noPaletteTheme = defineLinsTheme({
                ...warningFixtureTheme,
                colorThemes: [],
            });
            const css = noPaletteTheme.createThemeStylesheet();

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.definition.colorThemes).toEqual([]);
            expect(parsed.warnings).not.toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "missing-color-scheme-declaration" }),
            ]));
        });

        test.fails("concatenates multiple @font-face blocks into a single icons.fontFaceCss string (§8.5)", () => {
            const multiFontTheme = defineLinsTheme({
                ...warningFixtureTheme,
                icons: {
                    ...warningFixtureTheme.icons,
                    fontFaceCss: "@font-face { font-family: 'Material Symbols Outlined'; src: url('/icons.woff2') format('woff2'); }\n@font-face { font-family: 'Material Symbols Outlined'; src: url('/icons.woff') format('woff'); }",
                },
            });
            const css = multiFontTheme.createThemeStylesheet();

            const parsed = parseLinsStylesheet(css, {
                sourceId: "theme.css",
                theme: warningFixtureMetadata,
            });

            expect(parsed.definition.icons?.fontFaceCss).toContain("woff2");
            expect(parsed.definition.icons?.fontFaceCss).toContain("format('woff');");
        });

        test.fails("requires no warning when optOutClassName follows the not{PascalId} convention with no theme metadata", () => {
            const css = warningFixtureTheme.createStylesheet("button");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
            });

            expect(parsed.warnings).not.toEqual(expect.arrayContaining([
                expect.objectContaining({ code: "opt-out-class-mismatch" }),
            ]));
        });
    });

    describe("cosmetic differences that must never warn (§8.6)", () => {
        test.fails("does not warn for quote-style or whitespace-only selector differences", () => {
            const css = warningFixtureTheme.createStylesheet("button").replace(
                "input[type=button]",
                "input[type='button']",
            ).replace("@scope (", "@scope(").replace(") to (", ") to(");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual([]);
            expect(parsed.definition.categories?.button).toMatchObject(warningFixtureTheme.categories!.button!);
        });

        test.fails("does not warn for CRLF line endings or a missing trailing semicolon", () => {
            const css = warningFixtureTheme.createStylesheet("button")
                .replace(/\n/g, "\r\n")
                .replace("border-radius: 4px;", "border-radius: 4px");

            const parsed = parseLinsStylesheet(css, {
                sourceId: "button.css",
                stylesheetId: "button",
                theme: warningFixtureMetadata,
            });

            expect(parsed.warnings).toEqual([]);
        });
    });
});

