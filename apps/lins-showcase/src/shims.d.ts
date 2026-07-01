import type {BareElementTag} from "@web/lins/elements"

interface SolidClassAttribute {
    class: string | JSX.ClassList //Record<string | boolean> | Array<string | Record<string | boolean>>
    ["aria-selected"]: string | boolean
}
declare module '@solidjs/web' {
    namespace JSX {
        interface HTMLAttributes<T> extends SolidClassAttribute {}

        interface IntrinsicElements {
            ["input-shell"]: any
            ["form-field"]: any
            ["empty-state"]: any
            ["toast-stack"]: any
            ["progress-bar"]: any
        }
    }
}
