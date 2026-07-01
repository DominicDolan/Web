import "@solidjs/web";

interface SolidClassAttribute {
    class: string
    ["aria-selected"]: string | boolean
}

interface LinsCustomElements {
    ["input-shell"]: any
    ["form-field"]: any
    ["empty-state"]: any
    ["toast-stack"]: any
    ["progress-bar"]: any
}

declare module '@solidjs/web' {
    export namespace JSX {
        //noinspection JSUnusedGlobalSymbols
        interface HTMLAttributes<T> extends SolidClassAttribute {}

        //noinspection JSUnusedGlobalSymbols
        interface IntrinsicElements extends LinsCustomElements {}
    }
}

declare global {
    namespace JSX {
        //noinspection JSUnusedGlobalSymbols
        interface IntrinsicElements extends LinsCustomElements {}
    }
}

export {};
