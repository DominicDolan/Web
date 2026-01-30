
const customElements = []

function defineBareElements(tags: readonly string[]): void {
    for (const tag of tags) {
        if (window.customElements.get(tag)) continue;

        class Bare extends HTMLElement {}
        window.customElements.define(tag, Bare);
    }
}

const bareElementTags = [
    "tab-group",
    "tab-item",
    "chip-group",
    "chip-item",
    "feedback-message",
    "place-holder",
    "input-shell",
    "form-field",
    "popover-host",
    "popover-activator",
    "window-group"
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
            ["place-holder"]: any
            ["input-shell"]: any
            ["form-field"]: any
            ["popover-host"]: any
            ["popover-activator"]: any
            ["window-group"]: any
        }
    }
}
