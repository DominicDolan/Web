import {TypefaceDefinition} from "~/models/TypefaceDefinition";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";

type TypefaceAccessor = {
    [role in TypefaceRole]: {
        [type in TypefaceType]: TypefaceDefinition;
    };
};
/*
* @link https://utopia.fyi/type/calculator?c=360,18,1.2,1240,24,1.25,5,2,&s=0.75|0.5|0.25,1.5|2|3|4|6,s-l&g=s,l,xl,12

Font sizes mapping:
- small (label): clamp(0.7813rem, 0.7081rem + 0.325vw, 0.96rem) -> --font-size--2
- medium (label/body): clamp(0.9375rem, 0.8301rem + 0.4773vw, 1.2rem) -> --font-size--1
- large (title/body): clamp(1.125rem, 0.9716rem + 0.6818vw, 1.5rem) -> --font-size-0
- small (headline): clamp(1.35rem, 1.1352rem + 0.9545vw, 1.875rem) -> --font-size-1
- medium (headline/title): clamp(1.62rem, 1.3239rem + 1.3159vw, 2.3438rem) -> --font-size-2
- large (headline): clamp(1.944rem, 1.5408rem + 1.7922vw, 2.9297rem) -> --font-size-3
- small (display): clamp(2.3328rem, 1.789rem + 2.4169vw, 3.6621rem) -> --font-size-4
- large (display): clamp(2.7994rem, 2.0719rem + 3.2332vw, 4.5776rem) -> --font-size-5

--font-size-multiplier: 1.2
*/
export const defaultTypefaces: TypefaceDefinition[] = [
    // Display
    {
        id: "",
        type: "default",
        role: "display",
        css: "font-size: calc(clamp(2.3328rem, 1.789rem + 2.4169vw, 3.6621rem)*var(--font-size-multiplier));\nline-height: 3.5ch;\nletter-spacing: -0.25px;\nfont-weight: 400;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: ["h1.display-large"],
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "display",
        css: "font-size: calc(clamp(2.3328rem, 1.789rem + 2.4169vw, 3.6621rem)*var(--font-size-multiplier));\nline-height: 3.5ch;\nletter-spacing: -0.25px;\nfont-weight: 400;\nfont-family: serif;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: [],
        updatedAt: 0
    },

    // Headline
    {
        id: "",
        type: "default",
        role: "headline",
        css: "font-size: calc(clamp(1.944rem, 1.5408rem + 1.7922vw, 2.9297rem)*var(--font-size-multiplier));\nline-height: 2.8ch;\nletter-spacing: 0px;\nfont-weight: 400;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: ["h1\n.headline-large"],
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "headline",
        css: "font-size: calc(clamp(1.944rem, 1.5408rem + 1.7922vw, 2.9297rem)*var(--font-size-multiplier));\nline-height: 2.8ch;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: [],
        updatedAt: 0
    },

    // Title
    {
        id: "",
        type: "default",
        role: "title",
        css: "font-size: calc(clamp(1.62rem, 1.3239rem + 1.3159vw, 2.3438rem)*var(--font-size-multiplier));\nline-height: 2.2ch;\nletter-spacing: 0px;\nfont-weight: 400;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: ["h4\n.title-large"],
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "title",
        css: "font-size: calc(clamp(1.62rem, 1.3239rem + 1.3159vw, 2.3438rem)*var(--font-size-multiplier));\nline-height: 2.2ch;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: [],
        updatedAt: 0
    },

    // Body
    {
        id: "",
        type: "default",
        role: "body",
        css: "font-size: calc(clamp(1.35rem, 1.1352rem + 0.9545vw, 1.875rem)*var(--font-size-multiplier));\nline-height: 2ch;\nletter-spacing: 0.5px;\nfont-weight: 400;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: ["p\n.body-large"],
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "body",
        css: "font-size: calc(clamp(1.35rem, 1.1352rem + 0.9545vw, 1.875rem)*var(--font-size-multiplier));\nline-height: 2ch;\nletter-spacing: 0.5px;\nfont-weight: 400;\nfont-family: serif;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: [],
        updatedAt: 0
    },

    // Label
    {
        id: "",
        type: "default",
        role: "label",
        css: "font-size: calc(clamp(0.9375rem, 0.8301rem + 0.4773vw, 1.2rem)*var(--font-size-multiplier));\nline-height: 2ch;\nletter-spacing: 0.1px;\nfont-weight: 500;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: ["label\n.label-large"],
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "label",
        css: "font-size: calc(clamp(0.9375rem, 0.8301rem + 0.4773vw, 1.2rem)*var(--font-size-multiplier));\nline-height: 2ch;\nletter-spacing: 0.1px;\nfont-weight: 500;\nfont-family: serif;",
        largeCss: "--font-size-multiplier: 1.2",
        mediumCss: "--font-size-multiplier: 1",
        smallCss: "--font-size-multiplier: 0.8",
        applyAsDefault: [],
        updatedAt: 0
    },
];

export const defaultTypefacesQueryObject: TypefaceAccessor = defaultTypefaces.reduce((acc, typeface) => {
    if (!acc[typeface.role]) {
        acc[typeface.role] = {} as any;
    }
    acc[typeface.role][typeface.type] = typeface;
    return acc;
}, {} as TypefaceAccessor);
