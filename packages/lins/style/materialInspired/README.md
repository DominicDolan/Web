# LINS Theme MaterialInspired

This folder contains a Material Design 3-inspired LINS theme. It mirrors the
canonical `style/minimal/` theme structure while using MD3-style colour roles,
state layers, rounded shapes, elevation, tonal surfaces, and typography.

## How to start a new theme

1. Copy `packages/lins/style/materialInspired/` to `packages/lins/style/<your-theme>/`.
2. Rename `.materialInspiredTheme` in `theme.css` to your public root theme class.
3. Rename `.notMaterialInspired` in every file to your opt-out class.
4. Adjust the implemented selectors under `@layer elements` for your new visual language.
5. Keep invariant resets and soft defaults in `@layer base`.

## What is already included

- Imports matching the `minimal` theme file layout.
- Palette tokens and role classes (`.primary`, `.accent`, `.surface`, etc.).
- Base/reset styles for buttons, cards, inputs, text, lists, navigation,
  popovers, empty states, and icons.
- Implemented selectors for documented variants, states, and context hooks.
- Inline comments explaining when to use elements, variants, states, context,
  `:where()`, `@scope`, and the `--current-color` pattern.

## Design rule

Prefer filling selectors with colour, typography, border, shadow, surface, and
motion. Add layout only when it is a genuinely unopinionated default that app
utility classes can override.

