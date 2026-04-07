
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
 * - `empty-state`
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
 */
const bareElementTags = [
    "empty-state",
    "input-shell",
    "form-field",
    "progress-bar"
] as const
export type BareElementTag = typeof bareElementTags[number];

defineBareElements(
    bareElementTags
);
