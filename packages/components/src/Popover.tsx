import {createEffect, createSignal, onCleanup, onMount, type JSX, type ParentProps} from "solid-js";

export type PopoverPlacement = "bottom-end" | "bottom-start" | "top-end" | "top-start";

export type PopoverActivatorRenderProps = {
    ref: (el: HTMLElement) => void;
    onClick: JSX.EventHandlerUnion<HTMLElement, MouseEvent>;
    "aria-haspopup": "menu" | "dialog" | "listbox" | "tree" | "grid";
    "aria-expanded": boolean;
    "aria-controls": string;
};

export type PopoverProps = ParentProps<{
    /** Vuetify-style: render prop so we can inject handlers + ref */
    activator: (props: PopoverActivatorRenderProps) => JSX.Element;

    /** optional: controlled mode */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;

    /** behavior */
    closeOnContentClick?: boolean; // default true
    placement?: PopoverPlacement; // default "bottom-end"
    offset?: number; // default 6
    id?: string; // default auto

    /** styling hooks */
    contentClass?: string;
    contentStyle?: JSX.CSSProperties;
}>;

let popoverIdCounter = 0;

export default function Popover(props: PopoverProps) {
    const id = props.id ?? `popover-${++popoverIdCounter}`;
    const placement: PopoverPlacement = props.placement ?? "bottom-end";
    const offset = props.offset ?? 6;
    const closeOnContentClick = props.closeOnContentClick ?? true;

    let anchorEl: HTMLElement | undefined;
    let contentEl: HTMLDivElement | undefined;

    const [uncontrolledOpen, setUncontrolledOpen] = createSignal(false);
    const isControlled = () => props.open !== undefined;
    const isOpen = () => (isControlled() ? !!props.open : uncontrolledOpen());

    const setOpen = (next: boolean) => {
        if (!isControlled()) setUncontrolledOpen(next);
        props.onOpenChange?.(next);
    };

    const position = () => {
        if (!anchorEl || !contentEl) return;

        // Ensure we can measure it (if you style with display:none while closed, avoid that)
        const a = anchorEl.getBoundingClientRect();

        // Measure content size
        const cW = contentEl.offsetWidth;
        const cH = contentEl.offsetHeight;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

        // Compute desired position from placement
        let left = 0;
        let top = 0;

        const placeBottom = placement.startsWith("bottom");
        const alignEnd = placement.endsWith("end");

        if (placeBottom) {
            top = a.bottom + offset;
        } else {
            top = a.top - offset - cH;
        }

        if (alignEnd) {
            left = a.right - cW;
        } else {
            left = a.left;
        }

        // Clamp into viewport with a small padding
        const pad = 8;
        left = clamp(left, pad, vw - cW - pad);
        top = clamp(top, pad, vh - cH - pad);

        contentEl.style.left = `${left}px`;
        contentEl.style.top = `${top}px`;
    };

    const toggle = () => {
        setOpen(!isOpen());
    };
    const close = () => setOpen(false);

    const onDocumentPointerDown = (e: PointerEvent) => {
        if (!isOpen()) return;
        const t = e.target as Node | null;
        if (!t) return;

        // If click is within anchor or content, ignore
        if (anchorEl?.contains(t)) return;
        if (contentEl?.contains(t)) return;

        close();
    };

    const onDocumentKeyDown = (e: KeyboardEvent) => {
        if (!isOpen()) return;
        if (e.key === "Escape") {
            e.preventDefault();
            close();
            anchorEl?.focus?.();
        }
    };

    const onMove = () => {
        if (!isOpen()) return;
        position();
    };

    createEffect(() => {
        if (isOpen()) {
            // Wait a microtask so the content can lay out before measuring
            queueMicrotask(() => position());
        }
    });

    onMount(() => {
        document.addEventListener("pointerdown", onDocumentPointerDown, {capture: true});
        document.addEventListener("keydown", onDocumentKeyDown);
        window.addEventListener("resize", onMove);
        window.addEventListener("scroll", onMove, true);

        onCleanup(() => {
            document.removeEventListener("pointerdown", onDocumentPointerDown, {capture: true} as any);
            document.removeEventListener("keydown", onDocumentKeyDown);
            window.removeEventListener("resize", onMove);
            window.removeEventListener("scroll", onMove, true);
        });
    });

    const Activator = () =>
        props.activator({
            ref: (el) => (anchorEl = el),
            onClick: () => toggle(),
            "aria-haspopup": "menu",
            "aria-expanded": isOpen(),
            "aria-controls": id,
        });

    return (
        <>
            <Activator />

            {/* You can style this via [data-popover-content] or a class */}
            <div
                ref={contentEl}
                id={id}
                role="menu"
                data-popover-content
                class={props.contentClass}
                style={{
                    position: "fixed",
                    left: "0px",
                    top: "0px",
                    "z-index": 1000,
                    ...(isOpen() ? {} : {display: "none"}),
                    ...props.contentStyle,
                }}
                onClick={() => {
                    if (closeOnContentClick) close();
                }}
            >
                {props.children}
            </div>
        </>
    );
}
