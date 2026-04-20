import {TypefaceDefinition} from "~/models/TypefaceDefinition";
import {TypefaceRole, TypefaceSize, TypefaceType} from "~/constants/TypefaceRoles";

type TypefaceAccessor = {
    [role in TypefaceRole]: {
        [type in TypefaceType]: {
            [size in TypefaceSize]: TypefaceDefinition;
        };
    };
};

export const defaultTypefaces: TypefaceDefinition[] = [
    // Display
    {
        id: "",
        type: "default",
        role: "display",
        size: "large",
        css: "font-size: 57px;\nline-height: 64px;\nletter-spacing: -0.25px;\nfont-weight: 400;",
        applyAsDefault: "h1.display-large",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "display",
        size: "medium",
        css: "font-size: 45px;\nline-height: 52px;\nletter-spacing: 0px;\nfont-weight: 400;",
        applyAsDefault: "h1.display-medium",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "display",
        size: "small",
        css: "font-size: 36px;\nline-height: 44px;\nletter-spacing: 0px;\nfont-weight: 400;",
        applyAsDefault: "h1.display-small",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "display",
        size: "large",
        css: "font-size: 57px;\nline-height: 64px;\nletter-spacing: -0.25px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "display",
        size: "medium",
        css: "font-size: 45px;\nline-height: 52px;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "display",
        size: "small",
        css: "font-size: 36px;\nline-height: 44px;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },

    // Headline
    {
        id: "",
        type: "default",
        role: "headline",
        size: "large",
        css: "font-size: 32px;\nline-height: 40px;\nletter-spacing: 0px;\nfont-weight: 400;",
        applyAsDefault: "h1\n.headline-large",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "headline",
        size: "medium",
        css: "font-size: 28px;\nline-height: 36px;\nletter-spacing: 0px;\nfont-weight: 400;",
        applyAsDefault: "h2\n.headline-medium",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "headline",
        size: "small",
        css: "font-size: 24px;\nline-height: 32px;\nletter-spacing: 0px;\nfont-weight: 400;",
        applyAsDefault: "h3\n.headline-small",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "headline",
        size: "large",
        css: "font-size: 32px;\nline-height: 40px;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "headline",
        size: "medium",
        css: "font-size: 28px;\nline-height: 36px;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "headline",
        size: "small",
        css: "font-size: 24px;\nline-height: 32px;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },

    // Title
    {
        id: "",
        type: "default",
        role: "title",
        size: "large",
        css: "font-size: 22px;\nline-height: 28px;\nletter-spacing: 0px;\nfont-weight: 400;",
        applyAsDefault: "h4\n.title-large",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "title",
        size: "medium",
        css: "font-size: 16px;\nline-height: 24px;\nletter-spacing: 0.15px;\nfont-weight: 500;",
        applyAsDefault: "h5\n.title-medium",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "title",
        size: "small",
        css: "font-size: 14px;\nline-height: 20px;\nletter-spacing: 0.1px;\nfont-weight: 500;",
        applyAsDefault: "h6\n.title-small",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "title",
        size: "large",
        css: "font-size: 22px;\nline-height: 28px;\nletter-spacing: 0px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "title",
        size: "medium",
        css: "font-size: 16px;\nline-height: 24px;\nletter-spacing: 0.15px;\nfont-weight: 500;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "title",
        size: "small",
        css: "font-size: 14px;\nline-height: 20px;\nletter-spacing: 0.1px;\nfont-weight: 500;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },

    // Body
    {
        id: "",
        type: "default",
        role: "body",
        size: "large",
        css: "font-size: 16px;\nline-height: 24px;\nletter-spacing: 0.5px;\nfont-weight: 400;",
        applyAsDefault: "p\n.body-large",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "body",
        size: "medium",
        css: "font-size: 14px;\nline-height: 20px;\nletter-spacing: 0.25px;\nfont-weight: 400;",
        applyAsDefault: "body\n.body-medium",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "body",
        size: "small",
        css: "font-size: 12px;\nline-height: 16px;\nletter-spacing: 0.4px;\nfont-weight: 400;",
        applyAsDefault: ".body-small",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "body",
        size: "large",
        css: "font-size: 16px;\nline-height: 24px;\nletter-spacing: 0.5px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "body",
        size: "medium",
        css: "font-size: 14px;\nline-height: 20px;\nletter-spacing: 0.25px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "body",
        size: "small",
        css: "font-size: 12px;\nline-height: 16px;\nletter-spacing: 0.4px;\nfont-weight: 400;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },

    // Label
    {
        id: "",
        type: "default",
        role: "label",
        size: "large",
        css: "font-size: 14px;\nline-height: 20px;\nletter-spacing: 0.1px;\nfont-weight: 500;",
        applyAsDefault: "label\n.label-large",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "label",
        size: "medium",
        css: "font-size: 12px;\nline-height: 16px;\nletter-spacing: 0.5px;\nfont-weight: 500;",
        applyAsDefault: "button\n.label-medium",
        updatedAt: 0
    },
    {
        id: "",
        type: "default",
        role: "label",
        size: "small",
        css: "font-size: 11px;\nline-height: 16px;\nletter-spacing: 0.5px;\nfont-weight: 500;",
        applyAsDefault: "small\n.label-small",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "label",
        size: "large",
        css: "font-size: 14px;\nline-height: 20px;\nletter-spacing: 0.1px;\nfont-weight: 500;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "label",
        size: "medium",
        css: "font-size: 12px;\nline-height: 16px;\nletter-spacing: 0.5px;\nfont-weight: 500;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
    {
        id: "",
        type: "variant",
        role: "label",
        size: "small",
        css: "font-size: 11px;\nline-height: 16px;\nletter-spacing: 0.5px;\nfont-weight: 500;\nfont-family: serif;",
        applyAsDefault: "",
        updatedAt: 0
    },
];

export const defaultTypefacesQueryObject: TypefaceAccessor = defaultTypefaces.reduce((acc, typeface) => {
    if (!acc[typeface.role]) {
        acc[typeface.role] = {} as any;
    }
    if (!acc[typeface.role][typeface.type]) {
        acc[typeface.role][typeface.type] = {} as any;
    }
    acc[typeface.role][typeface.type][typeface.size] = typeface;
    return acc;
}, {} as TypefaceAccessor);
