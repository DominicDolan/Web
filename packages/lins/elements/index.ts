
const customElements = []

function defineBareElements(tags: readonly string[]): void {
    for (const tag of tags) {
        if (window.customElements.get(tag)) continue;

        class Bare extends HTMLElement {}
        window.customElements.define(tag, Bare);
    }
}

/**
 * ## Custom Tag Usage Pattern
 * - `feedback-message`
 *   - A generic container for validation text, alerts, helper text, or status feedback.
 *   - Used near inputs, forms, or inline notices.
 *
 * - `place-holder`
 *   - A placeholder/skeleton/empty visual slot.
 *   - Used when content is loading, missing, or being reserved in layout.
 *
 * - `input-shell`
 *   - A wrapper around an input and its surrounding chrome.
 *   - For borders, background, focus ring, icons, prefix/suffix, etc.
 *
 * - `form-field`
 *   - A semantic wrapper for a labeled field group.
 *   - Contains label, control, hint, and feedback.
 *
 * - `popover-host`
 *   - The outer anchoring container for a popover.
 *
 * - `popover-activator`
 *   - The trigger element for opening/closing a popover.
 *
 * - `toast-stack`
 *   - A live notification container for transient toasts.
 */
const bareElementTags = [
    "feedback-message",
    "place-holder",
    "input-shell",
    "form-field",
    "popover-host",
    "popover-activator",
    "window-group",
    "empty-state",
    "toast-stack",
    "progress-bar"
] as const
export type BareElementTag = typeof bareElementTags[number];

export interface BareElements {
    ["feedback-message"]: any
    ["place-holder"]: any
    ["input-shell"]: any
    ["form-field"]: any
    ["popover-host"]: any
    ["popover-activator"]: any
    ["window-group"]: any
    ["empty-state"]: any
    ["toast-stack"]: any
    ["progress-bar"]: any
}

defineBareElements(
    bareElementTags
);
