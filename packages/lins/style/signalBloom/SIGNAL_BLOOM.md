# Signal Bloom

Signal Bloom is an expressive, optimistic LINS theme for products that need personality while staying usable and systematic. It is suited to SaaS dashboards, AI tools, creative workflows, collaboration products, and social/productivity interfaces.

The theme should feel bright, responsive, generous, and emotionally warm. It uses soft-saturated colour, rounded surfaces, tonal fills, lively focus states, and controlled glow to make interfaces feel approachable without becoming chaotic.

## Design vocabulary

- Expressive
- Vibrant
- Friendly
- Optimistic
- Soft-saturated
- Rounded
- App-like
- High-affordance
- Contemporary SaaS
- Playful hierarchy
- Responsive
- Warmly digital

## Aesthetic direction

Signal Bloom is built around the idea of a signal becoming visible: active states, focus states, and selected items should feel illuminated, clear, and inviting. The theme can use more colour than Aperture or Foundry, but the colour should be structured through LINS role tokens rather than scattered across component-specific rules.

The theme should feel modern and product-oriented rather than childish. It should avoid random rainbow effects, uncontrolled gradients, and decorative motion that obscures usability. The goal is controlled optimism: bright accents, soft panels, and confident affordances.

## Palette strategy

Signal Bloom uses luminous blues and violets as the core product signal, supported by coral/pink secondary colour and fresh cyan/mint accents. Status roles are intentionally friendly and saturated enough to be recognizable.

### Light palette

- **Background**: very pale lavender-blue, like a luminous app canvas
- **Surface**: white with a slight cool tint
- **Primary**: electric blue-violet for primary actions and selected states
- **Secondary**: vivid coral/pink for alternate emphasis
- **Accent**: bright cyan/mint for highlights, focus, and playful markers
- **Success**: fresh green
- **Warning**: warm amber
- **Error**: softened vivid red

### Dark palette

- **Background**: deep navy/aubergine
- **Surface**: dark blue-violet panel
- **Primary**: luminous periwinkle
- **Secondary**: soft neon coral
- **Accent**: cyan/mint glow
- **Status colors**: bright enough to read on dark surfaces while avoiding harsh neon clipping

## Typography

Signal Bloom should use a friendly geometric or rounded sans-serif with high readability. The type system should feel confident and product-led.

Recommended font direction:

- `Plus Jakarta Sans`
- `Manrope`
- `Inter`
- `Nunito Sans`
- `Geist`
- `DM Sans`

LINS roles should feel like this:

- `.display`: confident, rounded, high personality
- `.headline`: clear and friendly section hierarchy
- `.title`: app-like component titles with medium-bold weight
- `.body`: readable, warm, and generous
- `.label`: compact, slightly bold, high-affordance UI text
- `.variant`: muted but still colour-aware, often using tinted neutrals instead of plain gray

## Shape language

Signal Bloom uses rounded surfaces and capsule-like controls.

- Cards: large-radius soft panels
- Buttons: pills or rounded squircles
- Inputs: approachable rounded fields, often tonal
- Chips: a first-class visual motif
- Tabs: underlined or pill-segmented controls
- Menus/popovers: friendly floating panels

The shape language should be expressive but consistent. Most corners should feel soft; only dense data contexts should pull radius down.

## Surface and elevation language

Signal Bloom can use coloured shadows and glow, but they should be subtle and stateful.

- Default cards can be flat or softly elevated.
- High-emphasis cards may use `.glow` or `.gradient`.
- Menus and dialogs can use tinted shadows to separate from the canvas.
- Tonal fills should be common and derived from `--current-color`.

## Planned signature variants

Signal Bloom extends the conventional LINS variant vocabulary with expressive theme-specific looks:

- `.glow`: coloured soft-shadow treatment for focus, selected, or high-emphasis surfaces.
- `.gradient`: subtle gradient fill, usually mixing primary/accent or active colour with surface.
- `.pill`: fully rounded capsule treatment for buttons, chips, tabs, and filters.
- `.soft`: pastel tonal treatment with low-contrast border and friendly hover states.
- `.pop`: higher-emphasis treatment with stronger colour, shadow, and affordance.

## Element category notes

### Cards

Cards should feel like soft application panels. `.tonal`, `.gradient`, and `.glow` should be meaningful card variants. `.highlighted` can use a colourful rail, bloom corner, or accent wash.

### Buttons

Buttons are a major personality surface. Filled buttons should be saturated and confident. Tonal buttons should feel friendly and low-risk. `.pill` should be available for primary actions, filter chips, and segmented controls.

### Inputs

Inputs should feel approachable and modern. Focus should create a clear colour signal through ring, glow, or tonal border. Placeholder and helper text should use tinted muted colours rather than neutral gray whenever possible.

### Lists and tabs

Chip lists are central to the theme. Tabs can use a colourful underline or inset pill track. Active list items should use a tonal fill, pill shape, or accent marker depending on context.

### Navigation

Navigation should feel lively but scannable. Top nav can use a softly tinted surface or subtle gradient. Side nav active states should be obvious through pill fills, colour, and weight.

### Dialogs and popovers

Dialogs should look like modern SaaS modals: rounded, gently elevated, and optionally tinted. Popovers should have clear hover states and generous radius.

### Empty states

Empty states can be more expressive than other themes. Use soft gradients, friendly icon treatment, dotted or dashed borders, and colourful but restrained illustration space.

## Motion

Motion should feel responsive and lively:

- Hover/focus transitions: 160–240ms
- Easing: soft ease-out
- Glow and colour transitions are encouraged
- Skeleton shimmer can be more visible than Aperture
- Avoid bounce-heavy motion unless it is limited to a very small decorative state

## Implementation notes

Signal Bloom should still obey LINS constraints: appearance belongs in theme CSS, layout remains controlled by markup and utilities. Colour expression should come from `--current-color`, `--active-color`, and palette roles, so a single role class like `.accent` can recolour cards, buttons, tabs, fields, and empty states consistently.

