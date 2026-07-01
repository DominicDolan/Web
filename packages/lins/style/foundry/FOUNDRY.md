# Foundry Theme

**Foundry** is an industrial LINS theme for technical products, admin tools, developer consoles, data-heavy dashboards, and control surfaces.

The visual language is **structured, durable, tactile, and high-confidence**. Foundry favours visible construction over decoration: strong strokes, hard-edged panels, compact labels, clear selected states, and immediate mechanical feedback.

## Design vocabulary

- Industrial
- Utilitarian
- Technical
- Dense
- Tactile
- Structured
- High-contrast
- Mechanical
- Control-panel inspired
- Brutalist refinement

## Aesthetic direction

Foundry should feel like a serious workbench: steel panels, stamped controls, clipped information hierarchy, and bold operational accents. It uses low-radius geometry, visible borders, inset shadows, structural rails, and uppercase labels to make the interface feel precise and tool-like.

The theme is intentionally less soft than the minimal theme. Elevation exists, but it is hard-edged rather than floating; selection is shown with rails, strong borders, and pressed surfaces rather than airy glow.

## Palette

Foundry ships with light and dark palettes.

- **Light mode** uses concrete gray backgrounds, warm steel surfaces, graphite text, and safety-orange accents.
- **Dark mode** uses blackened steel backgrounds, graphite surfaces, light technical text, and the same orange accent as an operational signal.

Semantic role classes remain standard LINS roles:

- `.primary`
- `.secondary`
- `.accent`
- `.success`
- `.warning`
- `.error`
- `.surface`
- `.background`

These only set `--active-color` and `--on-active-color`; element files resolve those through `--current-color` and `--on-current-color`.

## Typography

Foundry uses a technical sans-serif stack by default: IBM Plex Sans, Roboto Flex, Inter Tight, system UI, and platform sans-serif fallbacks.

The theme also defines `--mono-font-family` for code and breadcrumb/path-like UI.

Typography personality:

- `.display` is heavy, condensed-feeling, uppercase, and tightly tracked.
- `.headline` is architectural and uppercase.
- `.title` is compact and sturdy.
- `.body` is neutral and readable.
- `.label` is uppercase, tracked, and dashboard-like.
- `.variant` text reads as metadata or secondary instrumentation.

## Component language

### Cards

Cards are treated as **modules or panels**, not floating paper.

- Plain `article` defaults to an outlined panel.
- `.elevated` has a hard mechanical lift.
- `.inset` reads as a recessed instrument panel.
- `.highlighted` uses a strong accent rail.
- Nested cards default to outlined sub-panels.

### Buttons

Buttons are tactile command controls.

- Plain buttons default to `.outlined`.
- `.flat` is a solid command.
- `.elevated` adds hard-edged lift.
- `.tonal` uses a low-opacity active-colour fill.
- `.text` removes chrome.
- `.plain` is muted and toolbar-like.
- `.icon` is a square tool button.

Pressed/selected buttons use inset shadow to create a latched-control feel.

### Inputs

Inputs are instrument controls with strong borders, small radius, and clear focus outlines.

- Default fields are filled steel surfaces.
- `.outlined` and fields inside `article` become transparent structural controls.
- `.tonal` supports form-level or field-level status colour.
- Invalid fields use the semantic error token.

### Navigation and lists

Navigation uses rails, block fills, and path-like breadcrumbs.

- `nav.top` is a solid app bar with a hard bottom stroke.
- `nav.pageNav` and `aside > nav` are side panels.
- `ul.nav` active items use an accent rail.
- Breadcrumbs use mono typography and `/` separators.
- Menus are dense bordered panels.
- Tabs use structural underlines or inset segmented controls.

### Overlays

Dialogs and popovers are system panels: strong border, small radius, hard shadow, and muted modal backdrop.

### Empty states

Empty states look like system status panels. Skeletons use a scanning shimmer; `.empty` uses a dashed technical frame with a decorative bracket overlay.

## LINS notes

Foundry follows the LINS rule that theme CSS owns visual style, not page layout. The theme sets only soft defaults where the element category has a predictable shape: button padding, field padding, tab padding, card internal breathing room, and panel borders.
# Foundry Theme

**Foundry** is an industrial LINS theme for technical products, admin tools, developer consoles, data-heavy dashboards, and control surfaces.

The visual language is **structured, durable, tactile, and high-confidence**. Foundry favours visible construction over decoration: strong strokes, hard-edged panels, compact labels, clear selected states, and immediate mechanical feedback.

## Design vocabulary

- Industrial
- Utilitarian
- Technical
- Dense
- Tactile
- Structured
- High-contrast
- Mechanical
- Control-panel inspired
- Brutalist refinement

## Aesthetic direction

Foundry should feel like a serious workbench: steel panels, stamped controls, clipped information hierarchy, and bold operational accents. It uses low-radius geometry, visible borders, inset shadows, structural rails, and uppercase labels to make the interface feel precise and tool-like.

The theme is intentionally less soft than the minimal theme. Elevation exists, but it is hard-edged rather than floating; selection is shown with rails, strong borders, and pressed surfaces rather than airy glow.

## Palette

Foundry ships with light and dark palettes.

- **Light mode** uses concrete gray backgrounds, warm steel surfaces, graphite text, and safety-orange accents.
- **Dark mode** uses blackened steel backgrounds, graphite surfaces, light technical text, and the same orange accent as an operational signal.

Semantic role classes remain standard LINS roles:

- `.primary`
- `.secondary`
- `.accent`
- `.success`
- `.warning`
- `.error`
- `.surface`
- `.background`

These only set `--active-color` and `--on-active-color`; element files resolve those through `--current-color` and `--on-current-color`.

## Typography

Foundry uses a technical sans-serif stack by default:

```css
"IBM Plex Sans", "Roboto Flex", "Inter Tight", system-ui, sans-serif
```

The theme also defines `--mono-font-family` for code and breadcrumb/path-like UI.

Typography personality:

- `.display` is heavy, condensed-feeling, uppercase, and tightly tracked.
- `.headline` is architectural and uppercase.
- `.title` is compact and sturdy.
- `.body` is neutral and readable.
- `.label` is uppercase, tracked, and dashboard-like.
- `.variant` text reads as metadata or secondary instrumentation.

## Component language

### Cards

Cards are treated as **modules or panels**, not floating paper.

- Plain `article` defaults to an outlined panel.
- `.elevated` has a hard mechanical lift.
- `.inset` reads as a recessed instrument panel.
- `.highlighted` uses a strong accent rail.
- Nested cards default to outlined sub-panels.

### Buttons

Buttons are tactile command controls.

- Plain buttons default to `.outlined`.
- `.flat` is a solid command.
- `.elevated` adds hard-edged lift.
- `.tonal` uses a low-opacity active-colour fill.
- `.text` removes chrome.
- `.plain` is muted and toolbar-like.
- `.icon` is a square tool button.

Pressed/selected buttons use inset shadow to create a latched-control feel.

### Inputs

Inputs are instrument controls with strong borders, small radius, and clear focus outlines.

- Default fields are filled steel surfaces.
- `.outlined` and fields inside `article` become transparent structural controls.
- `.tonal` supports form-level or field-level status colour.
- Invalid fields use the semantic error token.

### Navigation and lists

Navigation uses rails, block fills, and path-like breadcrumbs.

- `nav.top` is a solid app bar with a hard bottom stroke.
- `nav.pageNav` and `aside > nav` are side panels.
- `ul.nav` active items use an accent rail.
- Breadcrumbs use mono typography and `/` separators.
- Menus are dense bordered panels.
- Tabs use structural underlines or inset segmented controls.

### Overlays

Dialogs and popovers are system panels: strong border, small radius, hard shadow, and muted modal backdrop.

### Empty states

Empty states look like system status panels. Skeletons use a scanning shimmer; `.empty` uses a dashed technical frame with a decorative bracket overlay.

## LINS notes

Foundry follows the LINS rule that theme CSS owns visual style, not page layout. The theme sets only soft defaults where the element category has a predictable shape: button padding, field padding, tab padding, card internal breathing room, and panel borders.

The opt-out class is `.notFoundry`.
