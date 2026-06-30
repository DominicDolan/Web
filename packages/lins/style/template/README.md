# LINS Theme Template

This folder is a starter scaffold for new LINS themes. It mirrors the canonical
`style/minimal/` theme, but keeps opinionated appearance mostly empty and
commented.

## How to start a new theme

1. Copy `packages/lins/style/template/` to `packages/lins/style/<your-theme>/`.
2. Rename `.templateTheme` in `theme.css` to your public root theme class.
3. Rename `.notTemplate` in every file to your opt-out class.
4. Fill in the TODO selectors under `@layer elements`.
5. Keep invariant resets and soft defaults in `@layer base`.

## What is already included

- Imports matching the `minimal` theme file layout.
- Palette tokens and role classes (`.primary`, `.accent`, `.surface`, etc.).
- Base/reset styles for buttons, cards, inputs, text, lists, navigation,
  popovers, empty states, and icons.
- Empty or lightly seeded selectors for documented variants, states, and
  context hooks.
- Inline comments explaining when to use elements, variants, states, context,
  `:where()`, `@scope`, and the `--current-color` pattern.

## Design rule

Prefer filling selectors with colour, typography, border, shadow, surface, and
motion. Add layout only when it is a genuinely unopinionated default that app
utility classes can override.

