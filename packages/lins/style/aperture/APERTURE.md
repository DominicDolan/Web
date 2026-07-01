# Aperture

Aperture is a calm, editorial LINS theme for products where clarity, trust, and content hierarchy matter more than decoration. It is inspired by premium productivity suites, photography portfolios, documentation systems, and quiet analytical dashboards.

The theme should feel like a well-lit studio: neutral surfaces, precise typography, soft focus, and just enough elevation to separate content without making the interface feel busy.

## Design vocabulary

- Editorial
- Airy
- Refined
- Quiet hierarchy
- Content-first
- Premium neutral
- Gallery-like
- Soft contrast
- Crisp but warm
- Calm productivity

## Aesthetic direction

Aperture uses restrained contrast, generous negative space, and subtle material cues. Surfaces should read as sheets, panels, and frames rather than heavy components. The visual system should make content feel curated and intentional, with interface chrome receding into the background.

The theme should avoid playful saturation, heavy gradients, and aggressive shadows. Its signature is precision: thin strokes, balanced radii, quiet accent color, and type that feels clean enough for dense product screens but elegant enough for editorial pages.

## Palette strategy

Aperture uses a warm neutral foundation with a single lens-like accent. The palette is designed to support long reading sessions, documentation, dashboards, forms, and content cards.

### Light palette

- **Background**: warm porcelain / gallery wall
- **Surface**: clean white with slight warmth
- **Primary**: deep ink blue for primary actions and strong text
- **Secondary**: muted slate for supporting chrome
- **Accent**: lens blue for focus, links, rails, and highlights
- **Success**: calm botanical green
- **Warning**: restrained amber
- **Error**: refined crimson

### Dark palette

- **Background**: deep blue-black
- **Surface**: graphite navy
- **Primary**: soft blue-white
- **Secondary**: blue-gray
- **Accent**: luminous cyan-blue
- **Status colors**: readable but restrained, avoiding neon saturation

## Typography

Aperture should use a modern humanist or neo-grotesque sans-serif. The ideal type system is crisp, readable, and editorial rather than playful.

Recommended font direction:

- `Inter`
- `Geist`
- `Avenir Next`
- `IBM Plex Sans`
- `Source Sans 3`

LINS roles should feel like this:

- `.display`: elegant page identity, generous scale, controlled weight
- `.headline`: architectural section headings
- `.title`: refined component/card titles
- `.body`: high-readability product copy
- `.label`: precise UI labels with slight tracking
- `.variant`: understated supporting copy, captions, and metadata

## Shape language

Aperture uses moderate radii and thin strokes.

- Cards: softly rounded rectangles
- Buttons: compact rounded rectangles or circular icon buttons
- Inputs: professional rounded fields
- Menus/popovers: clean floating sheets
- Empty states: framed gallery-like panels

The theme should not feel pill-heavy. Pills may appear in chips or segmented controls, but the overall shape system should stay refined and rectangular.

## Surface and elevation language

Aperture elevation should be soft, layered, and low contrast. Shadows should feel optical rather than dramatic.

- Default cards can be elevated, but only gently.
- Nested cards should demote to outlined/framed panels.
- Popovers and dialogs should use slightly stronger shadows than cards.
- Borders are thin and quiet, often visible only through subtle contrast.

## Planned signature variants

Aperture extends the conventional LINS variant vocabulary with a few theme-specific looks:

- `.glass`: translucent, softly blurred sheet treatment for overlays, app bars, or special panels.
- `.framed`: gallery-inspired border treatment for cards and media-adjacent content.
- `.quiet`: lower-emphasis treatment for secondary controls and understated panels.
- `.focus`: stronger editorial highlight with a precise accent line or focus frame.

## Element category notes

### Cards

Cards should feel like floating paper or framed content. The default look is elevated but restrained. `.outlined` and `.framed` are important for nested content, documentation examples, and gallery-like presentations.

### Buttons

Buttons should be precise and professional. Filled buttons are confident but not loud. Outlined and text buttons should carry most secondary actions. Icon buttons should be circular or softly rounded with very clear focus treatment.

### Inputs

Inputs should feel native to a premium productivity product: subtle background, clear border, and calm focus ring. Invalid states should be legible without looking alarming.

### Lists and tabs

Tabs should prefer understated underlines. Inset tabs may use a soft segmented-control surface, but should remain calm and low contrast.

### Navigation

Top navigation can use a very subtle translucent or solid surface. Side navigation should emphasize the active route through typography weight, a quiet tonal fill, or a precise accent rail.

### Dialogs and popovers

Dialogs should feel like premium product modals: white or graphite sheets, refined shadow, clear title/subtitle hierarchy, and restrained backdrop treatment.

### Empty states

Empty states should feel editorial and helpful. Use faint dashed frames, soft neutral illustration space, and muted copy.

## Motion

Motion should be quiet and fast:

- Hover/focus transitions: 120–180ms
- Easing: simple ease-out
- Skeleton shimmer: slow and low contrast
- Avoid bounce, spring, or theatrical movement

## Implementation notes

Aperture should follow the LINS `--current-color` pattern throughout. Role color classes should work consistently across cards, buttons, inputs, tabs, menus, and empty states. Layout defaults should remain soft and easily overridden by utility layers.

