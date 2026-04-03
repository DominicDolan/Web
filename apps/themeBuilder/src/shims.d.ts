import type {BareElementTag} from "@web/lins/elements"
declare module 'solid-js' {
    namespace JSX {
        interface IntrinsicElements {
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
    }
}
