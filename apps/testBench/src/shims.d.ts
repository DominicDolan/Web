type LayoutAttributeNames = "flex" | "grid" | "grid-area" | "grid-row" | "grid-col" | "grid-cols" | "spacing" | "sizing" | "display" | "position" | "gap"

export interface LayoutAttributes extends Partial<Record<LayoutAttributeNames, string | boolean>> {}

declare module '@solidjs/web' {
    namespace JSX {
        interface HTMLAttributes<T> extends LayoutAttributes {}
    }
}
