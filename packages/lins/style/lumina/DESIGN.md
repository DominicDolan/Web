# Lumina Theme Design Spec

This document describes the visual design currently implemented in `theme.css` for the Lumina LINS theme.

## Scope

- `theme.css` defines visual styling only.
- Layout remains utility-driven (LINS rule: Layout Is Not Style).
- This spec documents the rendered behavior of the current theme, not a future proposal.

## Theme Modes

Lumina ships with two theme roots:

- `.lumina.dark` (default look; also applied by `:root` tokens)
- `.lumina.light`

## Core Token System

### Typography

- Headline family: `Manrope` fallback to `Avenir Next`, `Segoe UI`, `sans-serif`
- Body/label family: `Inter` fallback to `Avenir Next`, `Segoe UI`, `sans-serif`
- Heading style: high weight (`800`), tight tracking, compact line-height
- Body style: `0.95rem`, line-height `1.45`

### Radius

- `--radius-sm: 0.125rem`
- `--radius-md: 0.25rem`
- `--radius-lg: 0.5rem`
- `--radius-xl: 0.75rem`
- `--radius-full: 9999px`

### Dark Palette (primary source)

- Background: `#131316`
- Surface ladder:
  - lowest `#0e0e11`
  - low `#1b1b1e`
  - base `#1f1f22`
  - high `#2a2a2d`
  - highest/variant `#353438`
- Content colors:
  - on background/surface `#e4e1e6`
  - on surface variant `#cac3d8`
- Primary accent:
  - primary `#cdbdff`
  - primary container `#7c4dff`
  - on primary `#370096`
  - on primary container `#fcf6ff`
- Secondary:
  - secondary `#cdbdff`
  - secondary container `#4e3b8c`
  - on secondary `#352071`
  - on secondary container `#c0acff`
- Tertiary:
  - tertiary `#ffb688`
  - tertiary fixed `#ffdbc7`
  - on tertiary `#512400`
  - on tertiary fixed `#311300`
- Outline:
  - outline `#948ea1`
  - outline variant `#494455`

### Feedback Colors

- Success: `#42d38f` / on success `#002114`
- Warning: `#ffca68` / on warning `#3e2b00`
- Error: `#ffb4ab` / on error `#690005`

### Ambient Effects

- Shadow color: `rgb(0 0 0 / 0.5)`
- Ambient accent shadow: `rgb(76 57 137 / 0.08)` in dark mode (`0.06` in light mode)
- Ghost border token: `rgb(from var(--outline-variant-color) r g b / 0.15)`
- Focus ring: `rgb(205 189 255 / 0.45)`

## Base Look and Feel

- Dark atmospheric backdrop with soft radial accents (violet + warm highlight).
- Selection styling uses primary container colors.
- Scrollbars are minimal, high-contrast against dark background.
- Forms use low-surface fills plus ghost-border treatment.
- "No-line" default: sectioning relies on tonal surface shifts, not visible 1px separators.

## Visual Variants

These classes control style emphasis only:

- `.flat`: base surface fill with no stroke.
- `.elevated`: gradient surface + ambient glow with ghost border.
- `.outlined`: transparent background with ghost border emphasis.
- `.tonal`: color-tinted surface derived from `--active-color` with low-opacity border.
- `.inset`: recessed panel treatment via inset shadow without stroke.
- `.text`: color-only emphasis, no chrome.
- `.plain`: de-emphasized neutral text action.
- `.icon`: circular icon action surface.

## Semantic Color Context Classes

These set active color context for child controls and variants:

- `.primary`
- `.secondary`
- `.success`
- `.warning`
- `.error`
- `.surface`

Each maps `--active-color` and `--on-active-color` for downstream use.

## Component Behavior

### Buttons

- Default button context uses `primary_container` / `on_primary_container`.
- Default and `.outlined` buttons are transparent with ghost-level borders.
- `.flat` is solid fill.
- `.elevated` uses gradient fill and stronger shadow.
- `.text` and `.plain` are low chrome actions.
- `.icon` buttons are circular icon affordances.
- Base button radius is `0.375rem` for the editorial CTA style.
- Hover: subtle scale-up (`1.02`) and contextual color overlays.
- Active: slight scale-down (`0.98`).
- Focus-visible: 2px themed ring.
- Disabled: reduced opacity, no transform.

### Inputs

- Rounded small-field style with dark low-surface fill.
- Outlined variant uses ghost-border opacity.
- Focus state uses a 2px secondary-tinted ring at 40% opacity.
- Placeholder text is muted to preserve hierarchy.

### Cards/Containers

- `article` and `.card` default to tonal layering with no explicit border or drop shadow.
- Variant overrides mirror global style variants (`flat`, `outlined`, `tonal`, `inset`).
- Internal card sections use consistent paddings.

### Lists and Navigation

- `ul.nav`: side-nav style with active left indicator and filled active row.
- `ul.plain`: simple list rows separated by vertical spacing/padding, not divider lines.
- `ul.menu` / `[role="menu"]`: glass surface (`surface_variant` transparency) + 20px blur + ambient shadow.
- `ul.tabs`: uppercase compact labels with active underline accent.

### Breadcrumbs

- Low-emphasis text with slash separators.

### Dialogs

- Glass modal treatment (`surface_variant` transparency + `backdrop-filter: blur(20px)`).
- Header/footer separation uses tonal fills instead of hard divider lines.
- Backdrop blur + dark veil.

## Accessibility and Interaction Notes

- Color scheme switches with `.lumina.dark` / `.lumina.light`.
- Interactive controls include focus-visible outlines.
- Contrast strategy prioritizes readable body text on dark surfaces.

## Alignment Status

- This document is synchronized with `packages/lins/style/lumina/theme.css` as currently implemented.
- If a new visual source is provided later, update this doc and the CSS together in the same change.
