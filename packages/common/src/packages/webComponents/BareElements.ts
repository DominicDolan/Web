function defineBareElements(tags: readonly string[]): void {
    for (const tag of tags) {
        if (customElements.get(tag)) continue;

        class Bare extends HTMLElement {}
        customElements.define(tag, Bare);
    }
}

const bareElementTags = [
    "tab-group",
    "tab-item",
    "chip-group",
    "chip-item",
    "feedback-message",
    "skeleton-loader",
    "input-shell",
    "form-field",
    "popover-host",
    "popover-activator",
] as const
export type BareElementTag = typeof bareElementTags[number];
defineBareElements(
    bareElementTags
);


declare module 'solid-js' {
    namespace JSX {
        interface IntrinsicElements {
            ["tab-group"]: any
            ["tab-item"]: any
            ["chip-group"]: any
            ["chip-item"]: any
            ["feedback-message"]: any
            ["skeleton-loader"]: any
            ["input-shell"]: any
            ["form-field"]: any
            ["popover-host"]: any
            ["popover-activator"]: any
        }
    }
}
