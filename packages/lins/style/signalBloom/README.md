# LINS Theme SignalBloom

Signal Bloom is a built LINS theme for expressive, optimistic product interfaces. It follows the LINS rule that layout stays in markup/utilities while theme CSS owns colour, typography, border, shadow, surface, shape, and motion.

## Usage

Import the stylesheet and apply the public root class plus a palette class:

```ts
import "@web/lins/signalBloom.css";
```

```html
<body class="signalBloomTheme light">
	<!-- app -->
</body>
```

Use `dark` instead of `light` for the dark palette.

## Theme classes

- Root theme class: `signalBloomTheme`
- Opt-out subtree class: `notSignalBloom`
- Palette classes: `light`, `dark`
- Colour role classes: `primary`, `secondary`, `accent`, `success`, `warning`, `error`, `surface`, `background`

## Implemented element categories

This folder mirrors the canonical LINS file layout:

- `theme.css` — palette, theme tokens, role classes, document defaults
- `button.css` — buttons, pseudo-buttons, links, radio groups
- `card.css` — card surfaces and card states
- `text.css` — type scale, muted variants, inline code, dividers
- `input.css` — text fields, custom input shells, choice inputs, form fields
- `list.css` — plain/nav/chip/menu lists and tab lists
- `nav.css` — top navigation, page navigation, breadcrumbs
- `popover.css` — popover menus, dialogs, backdrops
- `emptyState.css` — empty states and skeletons
- `icon.css` — Material Symbols-compatible icon styling

## Design notes

Signal Bloom uses soft-saturated violets/blues, coral secondary accents, cyan bloom highlights, generous rounded corners, tonal surfaces, and restrained glow. Variants such as `.glow`, `.gradient`, `.pill`, `.soft`, and `.pop` are implemented as appearance variants on existing LINS element categories.
