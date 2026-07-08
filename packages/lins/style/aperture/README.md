# LINS Theme Aperture

Aperture is a calm, editorial LINS theme for documentation, product screens,
dashboards, content cards, and gallery-like interfaces. It uses warm neutral
surfaces, deep ink typography, a precise lens-blue accent, thin strokes, and
soft optical elevation.

## Root classes

- Theme root: `.aperture`
- Light palette: `.light`
- Dark palette: `.dark`
- Scoped opt-out: `.notAperture`

Example:

```html
<body class="aperture light">
  <article class="framed">
    <h2>Aperture card</h2>
    <p>Quiet hierarchy with a gallery-like frame.</p>
  </article>
</body>
```

## Theme-specific variants

Aperture implements the conventional LINS variants and adds restrained
editorial treatments where appropriate:

- `.glass` for translucent frosted sheets, popovers, dialogs, menus, nav, and cards.
- `.framed` for gallery-inspired borders on cards, tabs, popovers, dialogs, and empty states.
- `.quiet` for lower-emphasis cards, buttons, inputs, nav, and lists.
- `.focus` for precise accent-framed emphasis on cards and buttons.

## Authoring notes

The CSS follows `LINS_STYLE.md` conventions:

- palette roles map through `--active-color` and resolve per element as `--current-color`;
- defaults use `:where(...)` so explicit variants override cleanly;
- state uses native hooks such as `:focus-visible`, `[aria-selected="true"]`, `[aria-current="page"]`, and `:invalid`;
- context hooks such as `article article`, `dialog > footer`, and breadcrumb lists stay selector-based;
- layout defaults are limited to soft, easily overridden affordances like padding, inline-flex controls, and chip spacing.

