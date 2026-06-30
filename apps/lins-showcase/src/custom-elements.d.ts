import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "form-field": JSX.HTMLAttributes<HTMLElement>;
      "input-shell": JSX.HTMLAttributes<HTMLElement>;
      "empty-state": JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

