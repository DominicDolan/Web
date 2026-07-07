export type LinsCssLayerName = "defaults" | "base" | "elements";

export interface LinsThemeSpec {
    readonly automaticImports: readonly string[];
    readonly defaultScope: LinsScopeSpec;
    readonly stylesheets: readonly LinsStylesheetSpec[];
    readonly colorRoles: readonly LinsColorRoleSpec[];
    readonly elementCategories: readonly LinsElementCategorySpec[];
    readonly typography: LinsTypographySpec;
    readonly icons: LinsIconSpec;
}

export interface LinsScopeSpec {
    readonly rootSelector: string;
    readonly optOutClassNamePattern: "not-{PascalId}";
}

export interface LinsStylesheetSpec {
    readonly id: string;
    readonly fileName: string;
    readonly importPath: string;
    readonly categoryIds: readonly string[];
    readonly includesTypography?: boolean;
}

export interface LinsColorRoleSpec {
    readonly id: string;
    readonly name: string;
    readonly cssVariable: `--${string}`;
    readonly onCssVariable: `--${string}`;
    readonly description: string;
}

export interface LinsElementCategorySpec {
    readonly id: string;
    readonly name: string;
    readonly stylesheetId: string;
    readonly selectors: readonly string[];
    readonly description: string;
    readonly states?: readonly LinsSelectorSlotSpec[];
    /** Non-variant sub-parts or related selectors emitted for this category. */
    readonly parts?: readonly LinsSelectorSlotSpec[];
    readonly scaffoldComment?: string;
}

export interface LinsSelectorSlotSpec {
    readonly id: string;
    readonly name: string;
    readonly selectors: readonly string[];
    readonly description: string;
    readonly scaffoldComment?: string;
}

export interface LinsTypographySpec {
    readonly stylesheetId: string;
    readonly roles: readonly LinsTypographyRoleSpec[];
    readonly roleVariants: readonly LinsTypographyRoleVariantSpec[];
    readonly sizes: readonly LinsTypographySizeSpec[];
    readonly inlineText: readonly LinsSelectorSlotSpec[];
}

export interface LinsTypographyRoleSpec {
    readonly id: "display" | "headline" | "title" | "body" | "label";
    readonly className: string;
    readonly defaultSelectors: readonly string[];
    readonly description: string;
    readonly scaffoldComment?: string;
}

export interface LinsTypographyRoleVariantSpec {
    readonly id: `${LinsTypographyRoleSpec["id"]}.variant`;
    readonly roleId: LinsTypographyRoleSpec["id"];
    readonly selector: `.${string}.variant`;
    readonly defaultSelectors: readonly string[];
    readonly description: string;
    readonly scaffoldComment?: string;
}

export interface LinsTypographySizeSpec {
    readonly id: "large" | "medium" | "small";
    readonly className: string;
    readonly defaultSelectors: readonly string[];
    readonly defaultMultiplier: string;
    readonly description: string;
}

export interface LinsIconSpec {
    readonly defaultFamily: string;
    readonly sizes: readonly LinsIconSizeSpec[];
}

export interface LinsIconSizeSpec {
    readonly id: "small" | "medium" | "large" | "xlarge";
    readonly className: string;
    readonly applyAsDefault?: readonly string[];
    readonly defaultSize: string;
}

export const LINS_STYLESHEET_SPECS = [
    { id: "button", fileName: "button.css", importPath: "./button.css", categoryIds: ["button", "radio-group", "link"] },
    { id: "text", fileName: "text.css", importPath: "./text.css", categoryIds: ["inline-text"], includesTypography: true },
    { id: "card", fileName: "card.css", importPath: "./card.css", categoryIds: ["card"] },
    { id: "input", fileName: "input.css", importPath: "./input.css", categoryIds: ["text-input", "checkbox-input", "radio-input", "range-input"] },
    { id: "feedback", fileName: "feedback.css", importPath: "./feedback.css", categoryIds: ["popover-feedback", "form-feedback"] },
    { id: "list", fileName: "list.css", importPath: "./list.css", categoryIds: ["list", "tab-list", "menu-list"] },
    { id: "icon", fileName: "icon.css", importPath: "./icon.css", categoryIds: ["icon"] },
    { id: "popover", fileName: "popover.css", importPath: "./popover.css", categoryIds: ["popover", "dialog"] },
    { id: "empty-state", fileName: "emptyState.css", importPath: "./emptyState.css", categoryIds: ["empty-state-skeleton", "empty-state-empty"] },
    { id: "navigation", fileName: "nav.css", importPath: "./nav.css", categoryIds: ["navigation", "breadcrumb"] },
] as const satisfies readonly LinsStylesheetSpec[];

export const LINS_COLOR_ROLE_SPECS = [
    { id: "primary", name: "Primary", cssVariable: "--primary-color", onCssVariable: "--on-primary-color", description: "Default emphasis colour for controls, outlines, selected states, and high-contrast UI chrome." },
    { id: "secondary", name: "Secondary", cssVariable: "--secondary-color", onCssVariable: "--on-secondary-color", description: "Supporting neutral colour role for secondary actions or alternate emphasis." },
    { id: "surface", name: "Surface", cssVariable: "--surface-color", onCssVariable: "--on-surface-color", description: "Card, dialog, popover, and other raised or contained surfaces." },
    { id: "background", name: "Background", cssVariable: "--background-color", onCssVariable: "--on-background-color", description: "Application/page background and its readable foreground colour." },
    { id: "accent", name: "Accent", cssVariable: "--accent-color", onCssVariable: "--on-accent-color", description: "Brand or highlight colour used for links, headings, focus accents, and markers." },
    { id: "success", name: "Success", cssVariable: "--success-color", onCssVariable: "--on-success-color", description: "Positive or completed status colour role." },
    { id: "warning", name: "Warning", cssVariable: "--warning-color", onCssVariable: "--on-warning-color", description: "Cautionary status colour role." },
    { id: "error", name: "Error", cssVariable: "--error-color", onCssVariable: "--on-error-color", description: "Error, destructive, invalid, and validation feedback colour role." },
] as const satisfies readonly LinsColorRoleSpec[];

const textInputSelector = "input:not([type=radio]):not([type=checkbox]):not([type=range]):not([type=color]):not([type=file]):not([type=image]):not([type=button]):not([type=submit]):not([type=reset])";

export const LINS_ELEMENT_CATEGORY_SPECS = [
    {
        id: "card",
        name: "Card",
        stylesheetId: "card",
        selectors: ["article"],
        description: "Surface containers for content, nested cards, interactive cards, and selection states.",
        states: [
            { id: "interactive", name: "Interactive", selectors: ["&[role=\"button\"]:hover", "&[role=\"button\"]:focus-visible"], description: "Interactive card hover/focus affordance.", scaffoldComment: "TODO: interactive card affordance." },
            { id: "deselected", name: "Deselected", selectors: ["&[aria-selected=\"false\"]"], description: "Muted/desaturated deselected state.", scaffoldComment: "TODO: muted/deselected card state." },
            { id: "selected", name: "Selected", selectors: ["&[aria-selected=\"true\"]", "&.active"], description: "Selected/current card state.", scaffoldComment: "TODO: selected/current card state." },
        ],
    },
    {
        id: "button",
        name: "Button",
        stylesheetId: "button",
        selectors: ["button", "input[type=button]", "input[type=submit]", "input[type=reset]", "input[type=image]", "[role=\"button\"]:not(article)"],
        description: "Action controls and button-like inputs using the active colour cascade.",
        states: [
            { id: "hover", name: "Hover", selectors: ["&:hover:not(:disabled):not([disabled])"], description: "Shared hover affordance.", scaffoldComment: "TODO: shared hover affordance if variants do not define their own." },
            { id: "focus", name: "Focus", selectors: ["&:focus-visible"], description: "Accessible focus ring.", scaffoldComment: "TODO: accessible focus ring." },
            { id: "active", name: "Active", selectors: ["&[aria-pressed=\"true\"]", "&[aria-selected=\"true\"]", "&.active"], description: "Pressed/selected active button state.", scaffoldComment: "TODO: pressed/selected active button state." },
        ],
    },
    {
        id: "radio-group",
        name: "Radio Group",
        stylesheetId: "button",
        selectors: ["[role=\"radiogroup\"]"],
        description: "Joined segmented-button group using child button states for selection.",
        parts: [
            { id: "button", name: "Child Button", selectors: ["& > button"], description: "Shared styling for child buttons in a radio group.", scaffoldComment: "TODO: shared segment button styling." },
            { id: "selected-button", name: "Selected Child Button", selectors: ["& > button[aria-checked=\"true\"]", "& > button[aria-selected=\"true\"]", "& > button.active"], description: "Selected segment state.", scaffoldComment: "TODO: selected segment state." },
        ],
    },
    {
        id: "link",
        name: "Link",
        stylesheetId: "button",
        selectors: ["a"],
        description: "Anchor reset plus current-page and hover/focus colour treatments.",
        states: [
            { id: "current", name: "Current", selectors: ["&[aria-current=\"page\"]", "&.active"], description: "Current route/page link state.", scaffoldComment: "TODO: current route/page link state." },
            { id: "interactive", name: "Interactive", selectors: ["&:hover", "&:focus-visible"], description: "Link hover/focus affordance.", scaffoldComment: "TODO: link interaction affordance." },
        ],
    },
    {
        id: "inline-text",
        name: "Inline Text",
        stylesheetId: "text",
        selectors: ["code", "hr", "li"],
        description: "Inline code, horizontal rule, and list-item text reset hooks.",
        parts: [
            { id: "code", name: "Code", selectors: ["code"], description: "Inline code chip surface.", scaffoldComment: "TODO: inline-code chip surface." },
            { id: "code-focus", name: "Code Focus", selectors: ["code:focus-within"], description: "Focus ring for editable/interactive code fragments.", scaffoldComment: "TODO: focus ring for editable/interactive code fragments." },
            { id: "list-item", name: "List Item", selectors: ["li"], description: "Default list item marker reset.", scaffoldComment: "TODO: list item marker/reset treatment." },
        ],
    },
    {
        id: "text-input",
        name: "Text Input",
        stylesheetId: "input",
        selectors: [textInputSelector, "textarea", "select", "input-shell"],
        description: "Text-like inputs, textareas, selects, and custom input shells.",
        states: [
            { id: "focus", name: "Focus", selectors: ["&:focus-visible", "&:focus-within"], description: "Focus ring/outline for native controls and input-shell.", scaffoldComment: "TODO: focus ring/outline for native controls and input-shell." },
            { id: "invalid", name: "Invalid", selectors: ["&:invalid", "&[aria-invalid=\"true\"]"], description: "Invalid state for native controls.", scaffoldComment: "TODO: invalid state for native controls." },
        ],
        parts: [
            { id: "input-shell-control", name: "Input Shell Control", selectors: ["input-shell input", "input-shell select", "input-shell textarea", "input-shell::part(default-control)"], description: "Inner native controls reset so the shell owns the chrome.", scaffoldComment: "TODO: input-shell inner control reset." },
            { id: "shell-invalid", name: "Shell Invalid", selectors: ["input-shell:has(input:invalid)", "input-shell:has(textarea:invalid)", "input-shell:has(select:invalid)", "input-shell[aria-invalid=\"true\"]"], description: "Invalid state when a custom shell contains the real control.", scaffoldComment: "TODO: invalid state when the custom shell contains the real control." },
            { id: "required-marker", name: "Required Marker", selectors: ["label:has(+ input[required])::after", "label:has(+ textarea[required])::after", "label:has(+ select[required])::after", "label:has(+ input-shell [required])::after"], description: "Visual required marker for required controls.", scaffoldComment: "TODO: required marker." },
        ],
    },
    {
        id: "checkbox-input",
        name: "Checkbox Input",
        stylesheetId: "input",
        selectors: ["input[type=checkbox]"],
        description: "Native checkbox controls using the theme accent colour.",
        states: [
            { id: "checked", name: "Checked", selectors: ["&:checked", "&[aria-checked=\"true\"]"], description: "Checked checkbox state.", scaffoldComment: "TODO: checked checkbox treatment, if different from accent-color." },
            { id: "invalid", name: "Invalid", selectors: ["&:invalid", "&[aria-invalid=\"true\"]"], description: "Invalid checkbox state.", scaffoldComment: "TODO: invalid checkbox treatment." },
        ],
    },
    {
        id: "radio-input",
        name: "Radio Input",
        stylesheetId: "input",
        selectors: ["input[type=radio]"],
        description: "Native radio controls using the theme accent colour.",
        states: [
            { id: "checked", name: "Checked", selectors: ["&:checked", "&[aria-checked=\"true\"]"], description: "Checked radio state.", scaffoldComment: "TODO: checked radio treatment, if different from accent-color." },
            { id: "invalid", name: "Invalid", selectors: ["&:invalid", "&[aria-invalid=\"true\"]"], description: "Invalid radio state.", scaffoldComment: "TODO: invalid radio treatment." },
        ],
    },
    {
        id: "range-input",
        name: "Range Input",
        stylesheetId: "input",
        selectors: ["input[type=range]"],
        description: "Native range/slider controls using the theme accent colour.",
        states: [
            { id: "focus", name: "Focus", selectors: ["&:focus-visible"], description: "Focused range input state.", scaffoldComment: "TODO: focused range input treatment." },
            { id: "disabled", name: "Disabled", selectors: ["&:disabled", "&[disabled]"], description: "Disabled range input state.", scaffoldComment: "TODO: disabled range input treatment." },
        ],
    },
    {
        id: "snackbar",
        name: "Snackbar Feedback",
        stylesheetId: "feedback",
        selectors: ["[popover] > output[role=status]"],
        description: "Transient feedback output messages rendered inside popover containers as a sttus update to the user.",
    },
    {
        id: "tooltip",
        name: "Tooltip Feedback",
        stylesheetId: "feedback",
        selectors: ["[popover] > output[role=tooltip]"],
        description: "Contextual feedback output messages anchored to contextual elements.",
    },
    {
        id: "form-feedback",
        name: "Form Feedback",
        stylesheetId: "feedback",
        selectors: ["form-field output"],
        description: "Feedback output messages associated with a form-field context.",
        states: [
            { id: "invalid", name: "Invalid", selectors: ["form-field:has(:invalid) output", "form-field:has([aria-invalid=\"true\"]) output", "form-field output[aria-invalid=\"true\"]"], description: "Validation/error feedback state for form-field output messages.", scaffoldComment: "TODO: invalid/error form feedback treatment, commonly error-coloured text." },
        ],
    },
    {
        id: "list",
        name: "List",
        stylesheetId: "list",
        selectors: ["ul", "ol"],
        description: "Plain lists, navigation-list styling, and chip sets.",
        states: [
            { id: "item-active", name: "Item Active", selectors: ["& > li[aria-current=\"page\"]", "& > li[aria-selected=\"true\"]", "& > li.active", "& > li:has(> [aria-current=\"page\"])", "& > li:has(> [aria-selected=\"true\"])", "& > li:has(> .active)"], description: "Active/current list item state.", scaffoldComment: "TODO: active/current list item state." },
            { id: "item-hover", name: "Item Hover", selectors: ["& > li:hover:not(.active):not(:has(.active))"], description: "Hover state for inactive list items.", scaffoldComment: "TODO: hover state for inactive list items." },
        ],
    },
    {
        id: "tab-list",
        name: "Tab List",
        stylesheetId: "list",
        selectors: ["ul[role=\"tablist\"]"],
        description: "Tab-list category with selected-item state styling.",
        states: [
            { id: "selected-tab", name: "Selected Tab", selectors: ["& > li[aria-selected=\"true\"]", "& > li.active", "& > li:has(> [aria-selected=\"true\"])", "& > li:has(> .active)"], description: "Selected tab item state.", scaffoldComment: "TODO: selected tab state." },
            { id: "tab-hover", name: "Tab Hover", selectors: ["& > li:hover:not([aria-selected=\"true\"]):not(.active):not(:has(.active))"], description: "Hover state for unselected tabs.", scaffoldComment: "TODO: hover state for unselected tabs." },
        ],
    },
    {
        id: "menu-list",
        name: "Menu List",
        stylesheetId: "list",
        selectors: ["ul[role=\"menu\"]", "ul.menu"],
        description: "Floating menu list surface and menu item states.",
        parts: [
            { id: "item", name: "Item", selectors: ["& > li", "& > [role=\"menuitem\"]"], description: "Menu item styling.", scaffoldComment: "TODO: menu item padding, hover, selected/current states." },
        ],
    },
    {
        id: "navigation",
        name: "Navigation",
        stylesheetId: "navigation",
        selectors: ["nav"],
        description: "Navigation landmarks for top bars and page/side navigation.",
        states: [
            { id: "current-link", name: "Current Link", selectors: ["nav a[aria-current=\"page\"]", "nav a.active"], description: "Current navigation link state.", scaffoldComment: "TODO: current navigation link state." },
        ],
    },
    {
        id: "breadcrumb",
        name: "Breadcrumb",
        stylesheetId: "navigation",
        selectors: ["nav[aria-label=\"Breadcrumb\"]"],
        description: "Breadcrumb navigation track with slash separators and muted title-variant text.",
        parts: [
            { id: "track", name: "Track", selectors: ["& > ol"], description: "Breadcrumb ordered-list track.", scaffoldComment: "TODO: breadcrumb track display/gap." },
            { id: "item", name: "Item", selectors: ["& > ol > li"], description: "Breadcrumb item style.", scaffoldComment: "TODO: breadcrumb item style." },
            { id: "separator", name: "Separator", selectors: ["& > ol > li + li::before"], description: "Decorative breadcrumb separator.", scaffoldComment: "TODO: breadcrumb separator." },
        ],
    },
    {
        id: "popover",
        name: "Popover",
        stylesheetId: "popover",
        selectors: ["[popover][role=\"menu\"]", "[popover].menu"],
        description: "Floating popover menu surface.",
    },
    {
        id: "dialog",
        name: "Dialog",
        stylesheetId: "popover",
        selectors: ["dialog"],
        description: "Modal dialog surface, backdrop, and footer treatment.",
        parts: [
            { id: "backdrop", name: "Backdrop", selectors: ["dialog::backdrop"], description: "Modal backdrop tint/blur.", scaffoldComment: "TODO: modal backdrop tint/blur." },
            { id: "footer", name: "Footer", selectors: ["dialog > footer"], description: "Dialog actions/footer row.", scaffoldComment: "TODO: dialog action-row appearance." },
            { id: "form-footer", name: "Form Footer", selectors: ["form > footer"], description: "Form action row appearance.", scaffoldComment: "TODO: form action row appearance, if any." },
        ],
    },
    {
        id: "empty-state-skeleton",
        name: "Skeleton Empty State",
        stylesheetId: "empty-state",
        selectors: ["empty-state.skeleton"],
        description: "Placeholder blocks that shimmer while aria-busy is present.",
        states: [
            { id: "busy", name: "Busy", selectors: ["empty-state.skeleton[aria-busy] *:not(:has(> *))"], description: "Animated busy skeleton placeholder blocks.", scaffoldComment: "TODO: busy skeleton shimmer animation/background." },
            { id: "not-busy", name: "Not Busy", selectors: ["empty-state.skeleton:not([aria-busy]) *:not(:has(> *))"], description: "Non-busy placeholder block style.", scaffoldComment: "TODO: non-busy placeholder style." },
        ],
        parts: [
            { id: "skeleton-block", name: "Skeleton Block", selectors: ["empty-state.skeleton *:not(:has(> *))"], description: "Base skeleton placeholder block.", scaffoldComment: "TODO: skeleton block base style." },
        ],
    },
    {
        id: "empty-state-empty",
        name: "Empty State",
        stylesheetId: "empty-state",
        selectors: ["empty-state.empty"],
        description: "Empty-content panel with a dashed inset border drawn by a pseudo-element.",
        parts: [
            { id: "empty-decoration", name: "Empty Decoration", selectors: ["empty-state.empty::after"], description: "Optional decorative outline/illustration.", scaffoldComment: "TODO: decorative empty-state outline/illustration." },
        ],
    },
    {
        id: "icon",
        name: "Icon",
        stylesheetId: "icon",
        selectors: ["i"],
        description: "Material Symbols icon element and size classes.",
    },
] as const satisfies readonly LinsElementCategorySpec[];

export const LINS_TYPOGRAPHY_SPEC = {
    stylesheetId: "text",
    roles: [
        {
            id: "display",
            className: "display",
            defaultSelectors: ["h1", "h2", "main > hgroup > h1", "main > hgroup > h2", "body > header h1", "body > header h2", "[role=\"banner\"] h1", "[role=\"banner\"] h2"],
            description: "Largest type role for page identity and hero text.",
            scaffoldComment: "TODO: display typeface treatment.",
        },
        {
            id: "headline",
            className: "headline",
            defaultSelectors: ["h3", "h4", "h5", "section > h1", "section > h2", "section > h3", "section > h4", "section > h5", "section > h6", "section > hgroup > h1", "section > hgroup > h2", "section > hgroup > h3", "section > hgroup > h4", "section > hgroup > h5", "section > hgroup > h6"],
            description: "Section-heading type role.",
            scaffoldComment: "TODO: headline typeface treatment.",
        },
        {
            id: "title",
            className: "title",
            defaultSelectors: ["h6", "article > h1", "article > h2", "article > h3", "article > h4", "article > h5", "article > h6", "article > hgroup > h1", "article > hgroup > h2", "article > hgroup > h3", "article > hgroup > h4", "article > hgroup > h5", "article > hgroup > h6", "dialog > h1", "dialog > h2", "dialog > h3", "dialog > h4", "dialog > h5", "dialog > h6", "dialog > hgroup > h1", "dialog > hgroup > h2", "dialog > hgroup > h3", "dialog > hgroup > h4", "dialog > hgroup > h5", "dialog > hgroup > h6", "nav.top h1", "nav.top h2", "nav.top h3", "nav.top h4", "nav.top h5", "nav.top h6", "empty-state.empty > h1", "empty-state.empty > h2", "empty-state.empty > h3", "empty-state.empty > h4", "empty-state.empty > h5", "empty-state.empty > h6", "empty-state.empty > hgroup > h1", "empty-state.empty > hgroup > h2", "empty-state.empty > hgroup > h3", "empty-state.empty > hgroup > h4", "empty-state.empty > hgroup > h5", "empty-state.empty > hgroup > h6"],
            description: "Component and card title role with minimal accent colour.",
            scaffoldComment: "TODO: title typeface treatment, including card-heading defaults.",
        },
        {
            id: "body",
            className: "body",
            defaultSelectors: ["p", "dt", "dd", "article > p", "article > section", "article > section > p", "section > p", "ul > *", "ol > *", "blockquote", textInputSelector, "textarea", "select", "input-shell", "empty-state.empty", "empty-state > p"],
            description: "Standard reading and form-control type role.",
            scaffoldComment: "TODO: body typeface treatment.",
        },
        {
            id: "label",
            className: "label",
            defaultSelectors: ["button", "input[type=button]", "input[type=submit]", "input[type=reset]", "input[type=image]", "[role=\"button\"]:not(article)", "[role=\"tab\"]", "ul[role=\"tablist\"] > li", "ul.chips > li", "nav", "nav a", "nav li", "ul.nav > li", "ul.menu > li", "ul[role=\"menu\"] > li", "ul.menu > [role=\"menuitem\"]", "ul[role=\"menu\"] > [role=\"menuitem\"]", "label", "form-field > label", "fieldset > legend"],
            description: "Compact high-weight text for actions, nav, labels, tabs, and chips.",
            scaffoldComment: "TODO: label typeface treatment.",
        },
    ],
    roleVariants: [
        { id: "display.variant", roleId: "display", selector: ".display.variant", defaultSelectors: ["main > hgroup > p", "body > header hgroup > p", "[role=\"banner\"] hgroup > p"], description: "Secondary line under a display heading.", scaffoldComment: "TODO: display variant treatment." },
        { id: "headline.variant", roleId: "headline", selector: ".headline.variant", defaultSelectors: ["section > hgroup > p", "section > header > p"], description: "Muted/secondary section heading text.", scaffoldComment: "TODO: headline variant treatment and section-heading defaults." },
        { id: "title.variant", roleId: "title", selector: ".title.variant", defaultSelectors: ["article > hgroup > p", "article > header > p", "dialog > hgroup > p", "dialog > header > p", "empty-state.empty > hgroup > p", "nav[aria-label=\"Breadcrumb\"]", "nav[aria-label=\"Breadcrumb\"] > ol", "nav[aria-label=\"Breadcrumb\"] > ol > li", "nav[aria-label=\"Breadcrumb\"] a"], description: "Muted/secondary component subtitle text.", scaffoldComment: "TODO: title variant treatment and section-heading defaults." },
        { id: "body.variant", roleId: "body", selector: ".body.variant", defaultSelectors: ["article > footer", "section > footer", "dialog > footer", "form > footer", "blockquote > footer"], description: "Muted/supporting body text.", scaffoldComment: "TODO: body variant treatment." },
        { id: "label.variant", roleId: "label", selector: ".label.variant", defaultSelectors: ["small", "figcaption", "caption", "time", "form-field output", "[popover] > output", "[popover] > output.snackbar", "[popover] > output.tooltip"], description: "Small muted metadata and feedback text.", scaffoldComment: "TODO: label variant treatment." },
    ],
    sizes: [
        { id: "large", className: "large", defaultSelectors: ["h1", "h3", "h6", "main > hgroup > h1", "body > header h1", "[role=\"banner\"] h1", "section > h1", "section > hgroup > h1", "empty-state.empty > h1", "empty-state.empty > hgroup > h1"], defaultMultiplier: "1.2", description: "Size multiplier for larger presentation of a type role." },
        { id: "medium", className: "medium", defaultSelectors: ["h2", "h4", "button", "input[type=button]", "input[type=submit]", "input[type=reset]", "input[type=image]", "[role=\"button\"]:not(article)", "[role=\"tab\"]", "ul[role=\"tablist\"] > li", "nav:not([aria-label=\"Breadcrumb\"])", "nav:not([aria-label=\"Breadcrumb\"]) a", "article > h1", "article > h2", "article > h3", "article > h4", "article > h5", "article > h6", "article > hgroup > h1", "article > hgroup > h2", "article > hgroup > h3", "article > hgroup > h4", "article > hgroup > h5", "article > hgroup > h6", "dialog > h1", "dialog > h2", "dialog > h3", "dialog > h4", "dialog > h5", "dialog > h6", "dialog > hgroup > h1", "dialog > hgroup > h2", "dialog > hgroup > h3", "dialog > hgroup > h4", "dialog > hgroup > h5", "dialog > hgroup > h6", textInputSelector, "textarea", "select", "input-shell"], defaultMultiplier: "1", description: "Default size multiplier for a type role." },
        { id: "small", className: "small", defaultSelectors: ["h5", "small", "figcaption", "caption", "time", "main > hgroup > p", "body > header hgroup > p", "[role=\"banner\"] hgroup > p", "section > hgroup > p", "section > header > p", "article > hgroup > p", "article > header > p", "dialog > hgroup > p", "dialog > header > p", "empty-state.empty > hgroup > p", "ul.chips > li", "nav[aria-label=\"Breadcrumb\"]", "nav[aria-label=\"Breadcrumb\"] > ol", "nav[aria-label=\"Breadcrumb\"] > ol > li", "nav[aria-label=\"Breadcrumb\"] a", "form-field > label", "form-field output", "[popover] > output", "[popover] > output.snackbar", "[popover] > output.tooltip", "fieldset > legend"], defaultMultiplier: "0.85", description: "Reduced size multiplier for captions, metadata, feedback, and compact UI text." },
    ],
    inlineText: [
        { id: "code", name: "Code", selectors: ["code"], description: "Inline-code chip surface.", scaffoldComment: "TODO: inline-code chip surface." },
        { id: "code-focus", name: "Code Focus", selectors: ["code:focus-within"], description: "Focus ring for interactive code fragments.", scaffoldComment: "TODO: focus ring for editable/interactive code fragments." },
        { id: "list-item", name: "List Item", selectors: ["li"], description: "Default list item reset.", scaffoldComment: "TODO: list item reset." },
    ],
} as const satisfies LinsTypographySpec;

export const LINS_ICON_SPEC = {
    defaultFamily: "Material Symbols Outlined",
    sizes: [
        { id: "small", className: "small", defaultSize: "1em" },
        { id: "medium", className: "medium", applyAsDefault: ["i"], defaultSize: "1.3em" },
        { id: "large", className: "large", defaultSize: "1.5em" },
        { id: "xlarge", className: "xlarge", defaultSize: "2em" },
    ],
} as const satisfies LinsIconSpec;

export const LINS_THEME_SPEC = {
    automaticImports: ["../reset.css", "../base.css"],
    defaultScope: {
        rootSelector: "body",
        optOutClassNamePattern: "not-{PascalId}",
    },
    stylesheets: LINS_STYLESHEET_SPECS,
    colorRoles: LINS_COLOR_ROLE_SPECS,
    elementCategories: LINS_ELEMENT_CATEGORY_SPECS,
    typography: LINS_TYPOGRAPHY_SPEC,
    icons: LINS_ICON_SPEC,
} as const satisfies LinsThemeSpec;

export type LinsStylesheetId = typeof LINS_STYLESHEET_SPECS[number]["id"];
export type LinsColorRoleId = typeof LINS_COLOR_ROLE_SPECS[number]["id"];
export type LinsElementCategoryId = typeof LINS_ELEMENT_CATEGORY_SPECS[number]["id"];
export type LinsTypographyRoleId = typeof LINS_TYPOGRAPHY_SPEC.roles[number]["id"];
export type LinsTypographyRoleVariantId = typeof LINS_TYPOGRAPHY_SPEC.roleVariants[number]["id"];
export type LinsTypographySizeId = typeof LINS_TYPOGRAPHY_SPEC.sizes[number]["id"];
export type LinsIconSizeId = typeof LINS_ICON_SPEC.sizes[number]["id"];


