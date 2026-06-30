# LINS Style: CSS Authoring Guide

`LINS` means **Layout Is Not Style**.

This document is the companion to `LINS_HTML_GUIDE.md`. The HTML guide tells
authors *how to mark up* a page so that a LINS theme can style it. This guide
tells theme authors *how to write* the CSS that powers those themes.

A LINS theme is a stylesheet that:

1. Targets **Element Categories** — groups of HTML tags (or tag + role
   combinations) whose styling is shared, e.g. all button-like inputs,
   or a tab-list `ul[role="tablist"]`.
2. Branches on **Variants** (utility-free style classes like `.elevated`).
3. Reacts to **States** (native HTML/ARIA attributes and CSS pseudo-classes).
4. Uses **Context** (parent/child relationships) to refine appearance.
5. Owns **only** colour, typography, border, shadow, surface and motion.
   It never owns layout.

The reference implementation is `packages/lins/style/minimal/`. Read it as
the canonical example of the rules below.

---

## 1. Core Principles

### 1.1 Layout is Not Style

A LINS stylesheet's **primary** job is colour, typography, border, shadow,
surface, and motion — never page layout. Concretely it **owns**:

- `color`, `background`, `background-color`, `background-image`
- `border`, `border-radius`, `outline`
- `box-shadow`, `filter`, `opacity`
- `font-*`, `line-height`, `letter-spacing`, `text-transform`
- `transition`, `animation`, `cursor`, `user-select`
- Theme custom properties (`--primary-color`, `--current-color`, …)

#### A little layout is fine

A theme **may** also set layout properties, but only when the layout
choice is **unopinionated and unlikely to change** for that element.
The utility classes used in markup live in a *higher* cascade layer, so
any layout the theme sets can be cleanly overridden by a Tailwind/UnoCSS
utility in the HTML — it's a default, not a lock.

Good "soft" layout in the theme:

- Inner padding on a button or card (`padding: 0.5rem 0.9rem`).
- `display: inline-flex` on a breadcrumb that only ever reads as a row.
- `gap` between joined buttons in a `[role="radiogroup"]`.
- `display: block` on a custom tag like `empty-state` so it has a sensible default.

Bad "hard" layout in the theme — leave these to the markup:

- Page-level `width` / `max-width`, column counts, sidebars.
- `margin` between *unrelated* siblings.
- `position: absolute | fixed | sticky` for placing real content
  (positioning purely decorative pseudo-elements like an underline
  `::after` is fine).
- `flex-direction`, `justify-content`, `align-items` choices that depend
  on the surrounding page, not on the element itself.

Rule of thumb: if a sensible designer would *never* change this layout
for this element, the theme can set it. If two designs might reasonably
disagree, leave it for the markup.

### 1.2 Elements, Variants, States, Context

Every LINS selector should fall into one of these four buckets. If a
selector mixes more than one bucket, that is fine — what matters is that
each *kind of decision* is expressed using the right mechanism.

| Bucket            | Mechanism                                  | Example                              |
| ----------------- | ------------------------------------------ | ------------------------------------ |
| Element Category  | Tag(s), custom tag, or tag + role          | `button, input[type=button…]`, `empty-state`, `ul[role="tablist"]` |
| Variant           | Class                                      | `.elevated`, `.tonal`, `.underlined` |
| State             | Attribute / pseudo-class                   | `[disabled]`, `:invalid`, `[aria-busy]` |
| Context           | Combinator / `:where()` / `@scope`         | `article > footer`, `section > hgroup > h3` |

---

## 2. Stylable Elements & Element Categories

### 2.0 Element Categories

An **Element Category** is a group of HTML elements (or tags + roles)
whose styling is *shared* — they reset the same way, accept the same
variants, and react to the same states. A category is the unit a theme
file talks about.

Two pieces of markup belong to the same category when it would be
natural to write them on the same selector line. So:

- `button, input[type=button|submit|reset|image]` → one category
  (**Button**) — they all want the same chrome, hover, focus, and
  variants.
- `ul, li` → the **List** category — generic list with default item
  styling.
- `ul[role="tablist"]` (and its `> li` tabs) → a *different* category
  (**Tab List**), even though it shares the `ul` tag.
- `nav` (top/side nav) vs `nav[aria-label="Breadcrumb"]` → two
  categories.
- `article` (card) vs `article[role="button"]` → still the **Card**
  category, but with an interactive-state augmentation. A new category
  is only warranted when the *whole* styling story diverges, not when a
  single state is added.

#### The canonical categories

Below is the complete set the minimal theme implements. New themes are
expected to cover this list; new themes may also introduce additional
categories of their own.

| # | Category          | File              | Selectors (the group)                                                |
|---|-------------------|-------------------|----------------------------------------------------------------------|
| 1 | Card              | `card.css`        | `article`                                                            |
| 2 | Button            | `button.css`      | `button`, `input[type=button\|submit\|reset\|image]`, `[role="button"]` |
| 3 | Radio Group       | `button.css`      | `[role="radiogroup"]` + its child `button`s                          |
| 4 | Link              | `button.css`      | `a`                                                                  |
| 5 | Typography        | `text.css`        | `body`, `h1`–`h6`, `.display`/`.headline`/`.title`/`.body`/`.label` (× `.small`/`.medium`/`.large` × `.variant`) |
| 6 | Inline Text       | `text.css`        | `code`, `hr`                                                         |
| 7 | Text Input        | `input.css`       | `input:not([type=radio])`, `textarea`, `select`, `input-shell`       |
| 8 | Choice Input      | `input.css`       | `input[type=checkbox\|radio\|range]`                                 |
| 9 | Form Field        | `input.css`       | `form-field`, `fieldset`, `form-field output`                        |
|10 | List              | `list.css`        | `ul`, `ol`, `li`                                                     |
|11 | Tab List          | `list.css`        | `ul[role="tablist"]` + its `> li` tabs                               |
|12 | Menu List         | `list.css`        | `ul[role="menu"]`, `ul.menu`                                         |
|13 | Navigation        | `nav.css`         | `nav`, `nav.top`, `nav.pageNav`, `aside > nav`                       |
|14 | Breadcrumb        | `nav.css`         | `nav[aria-label="Breadcrumb"]` + `nav > ol`                          |
|15 | Popover           | `popover.css`     | `[popover][role="menu"]`, `[popover].menu`                           |
|16 | Dialog            | `popover.css`     | `dialog`, `dialog > footer`                                          |
|17 | Empty State       | `emptyState.css`  | `empty-state`, `empty-state.skeleton`, `empty-state.empty`           |
|18 | Icon              | `icon.css`        | `i`                                                                  |

> **How to spot a new category.** If you find yourself starting a new
> top-level selector that doesn't fit any row above, you're likely
> introducing a new category. Give it a name, list its selectors, and
> apply the same Elements/Variants/States/Context structure to it.

The subsections below detail the individual elements inside each
category, the variants they accept, and the contexts that style them.

### 2.1 Surface elements — `card.css`

| Element                | Selector                  | Notes                              |
| ---------------------- | ------------------------- | ---------------------------------- |
| Card                   | `article`                 | Default surface container          |
| Nested card            | `article article`         | Auto-demoted to outlined           |
| Interactive card       | `article[role="button"]`  | Adds hover elevation, cursor       |
| Deselected card        | `article[aria-selected="false"]` | Muted/desaturated         |

### 2.2 Action elements — `button.css`

| Element                | Selector                              | Notes                  |
| ---------------------- | ------------------------------------- | ---------------------- |
| Button                 | `button`, `input[type=button\|submit\|reset\|image]` | Base action |
| Link                   | `a`                                   | Resets browser default |
| Pseudo-button          | `[role="button"]`                     | Cursor + interactive   |
| Radio group            | `[role="radiogroup"]`                 | Joined-button row      |
| Radio group button     | `[role="radiogroup"] button`          | Shared borders, no rounding except ends |

### 2.3 Typography elements — `text.css`

LINS uses the **Material Design 3 type scale**. There are five typeface
roles, each available in three sizes and each with a `.variant`
sub-style that's typically used for subtitles, key/value pairs, captions
under a heading, and similar "secondary" text.

| Role       | Purpose                                                |
| ---------- | ------------------------------------------------------ |
| `.display` | Hero / marketing-sized text                            |
| `.headline`| Page and section headers                               |
| `.title`   | Component / card titles                                |
| `.body`    | Standard reading text                                  |
| `.label`   | Small metadata, captions, form labels, chip text       |

Sizes are applied as a **second class**, so the typeface and the size
compose independently:

```html
<h1 class="display large">Welcome</h1>
<p  class="title medium">Project settings</p>
<p  class="body small variant">Last updated 2 days ago</p>
```

`.small`, `.medium`, `.large` are the three sizes. Order doesn't matter
(`.large .display` is equivalent to `.display .large`).

The `.variant` modifier on any typeface yields the muted/secondary
treatment — typically used for:

- Subtitles under a heading (`title` + `title.variant`).
- The "label" half of a label/value pair.
- Captions and metadata under a card heading.

```html
<hgroup>
  <h2 class="headline medium">Inbox</h2>
  <p  class="headline small variant">3 unread messages</p>
</hgroup>

<dl class="flex gap-4">
  <dt class="label medium variant">Status</dt>
  <dd class="label medium">Active</dd>
</dl>
```

Other text elements covered in `text.css`:

| Element             | Selector                                  | Notes                       |
| ------------------- | ----------------------------------------- | --------------------------- |
| Body text           | `body`                                    | Base typography             |
| Headings            | `h1`–`h6`                                 | Map onto the scale          |
| Card heading        | `article > h3`, `article > hgroup > *`    | Context-styled title        |
| Section heading     | `section > h*`, `section > hgroup > *`    | Uppercased section label    |
| Inline code         | `code`                                    | Subtle chip                 |
| Horizontal rule     | `hr`                                      | Thin theme-coloured line    |
| Bullet item         | `li`                                      | Default `list-style` reset  |
| List item text      | `ul > *`                                  | Body-sm default             |

### 2.4 Form elements — `input.css`

| Element             | Selector                                          | Notes                          |
| ------------------- | ------------------------------------------------- | ------------------------------ |
| Text input          | `input` (text-like types only), `textarea`, `select`, `input-shell` | Share the same chrome, padding, radius, and variants. The "text-like" set is everything *except* `radio`, `checkbox`, `range`, `color`, `file`, `image`, `button`, `submit`, `reset`. Write it as a chained `:not()` list, e.g. `input:not([type=radio]):not([type=checkbox])…`. |
| Input shell         | `input-shell`                                     | Custom wrapper, exposes `::part(default-control)`. Styled identically to `input` so a custom-element input feels native. |
| Form field          | `form-field`                                      | Label + control + feedback group |
| Validation output   | `form-field output`                               | Error text slot                |
| Fieldset            | `fieldset`                                        | Unstyled grouping              |
| Choice control      | `input[type=checkbox\|radio\|range]`              | Uses `accent-color`            |

### 2.5 List elements — `list.css`

| Element             | Selector                              | Notes                              |
| ------------------- | ------------------------------------- | ---------------------------------- |
| Plain list          | `ul`, `ol`                            | Reset, theme tokens                |
| Tab list            | `ul[role="tablist"]`                  | Horizontal tabs                    |
| Menu                | `ul[role="menu"]`, `ul.menu`          | Floating menu surface              |
| Tab                 | `[role="tablist"] > li`               | Single tab                         |

### 2.6 Navigation elements — `nav.css`

| Element             | Selector                              | Notes                              |
| ------------------- | ------------------------------------- | ---------------------------------- |
| Top nav             | `nav.top`                             | App-bar style                      |
| Breadcrumb          | `nav[aria-label="Breadcrumb"]`        | Separator-delimited path           |
| Side nav            | `nav.pageNav`, `aside > nav`          | Vertical sidebar                   |

### 2.7 Overlay elements — `popover.css`

| Element             | Selector                              | Notes                              |
| ------------------- | ------------------------------------- | ---------------------------------- |
| Popover menu        | `[popover][role="menu"]`, `[popover].menu` | Positioned floating panel    |
| Dialog              | `dialog`                              | Modal surface                      |
| Dialog actions      | `dialog > footer`                     | Button row                         |

### 2.8 Placeholder elements — `emptyState.css`

| Element             | Selector                              | Notes                              |
| ------------------- | ------------------------------------- | ---------------------------------- |
| Empty slot          | `empty-state`                         | Generic missing-content holder     |
| Skeleton            | `empty-state.skeleton`                | Greyed-out shape stand-in          |
| Empty illustration  | `empty-state.empty`                   | Dashed-border "nothing here" panel |

### 2.9 Icon elements — `icon.css`

| Element             | Selector                              | Notes                              |
| ------------------- | ------------------------------------- | ---------------------------------- |
| Icon                | `i`                                   | Material Symbols glyph             |

> **Note on `ul` vs `ul[role="tablist"]`.** These belong to *different
> element categories* (List vs Tab List) even though they share a tag.
> Style them in separate rules — they reset differently and accept
> different variants. The same principle applies to `nav` vs
> `nav[aria-label="Breadcrumb"]`, and to anywhere else where adding a
> role fundamentally changes the styling story. (Compare with
> `article` vs `article[role="button"]`: those stay in the *same*
> category because only one state is added.)

---

## 3. Variants

A variant is a **class** that swaps the *look* of an element while keeping
its semantics intact. Variants are the main extensibility surface of a
LINS theme.

### 3.1 Conventional variants

The following variant names are shared across many elements. New themes
are expected to honour them where they make sense, but are also expected
to add more.

| Variant        | Intent                                                    |
| -------------- | --------------------------------------------------------- |
| `.elevated`    | High emphasis, with shadow                                |
| `.flat`        | High emphasis, no shadow                                  |
| `.outlined`    | Medium emphasis, border-only                              |
| `.tonal`       | Low-opacity tint of the active colour                     |
| `.inset`       | Recessed (inner shadow)                                   |
| `.highlighted` | Adds an accent bar / marker                               |
| `.text`        | No chrome, text-only                                      |
| `.plain`       | Minimal, subtle hover                                     |
| `.icon`        | Square / circular variant for icon-only use               |
| `.active`      | Selected / pressed state (used as variant, not state)     |

Colour-role variants (covered in §5):

`.primary`, `.secondary`, `.accent`, `.success`, `.warning`, `.error`,
`.surface`, `.background`.

Typography variants (see `text.css` and §2.3):

`.display`, `.headline`, `.title`, `.body`, `.label` — composed with a
size class (`.small`, `.medium`, `.large`) and optionally `.variant` for
the secondary/subtitle treatment.

List variants (see `list.css`):

`.nav`, `.plain`, `.menu`, `.chips`, `.underlined`, `.inset` (on tablist).

### 3.2 Inventing new variants

You are **encouraged** to introduce variants that are specific to your
theme's voice. A "brutalist" theme may add `.stamped` or `.cut`. A
"glass" theme may add `.frosted` or `.glow`. As long as the variant is a
class on an existing LINS element and only changes appearance, it is
on-spec.

When adding a new variant:

- Pick a name that describes the **look**, not the use case
  (`.glow`, not `.warning-glow`).
- Place the rule under the element it applies to, using the `&.variant`
  nesting pattern shown below.
- Never make a variant change layout. A variant that adds `display:flex`
  or `width: 100%` is a bug.

### 3.3 Writing variants

Use CSS nesting to keep each element's variants colocated, and use
`:where()` to mark **which variant is the default**.

```css
@layer elements {
  article {
    /* default + explicit "elevated" share the same rule */
    :where(&), &.elevated     { box-shadow: 0 8px 12px -1px var(--shadow-color); }
    :where(&), &.flat,
    :where(&), &.elevated     { background-color: var(--current-color); }

    &.flat                    { box-shadow: none; }
    &.outlined                { background: transparent; border: 1px solid …; }
    &.tonal                   { background-color: color-mix(in oklab, var(--current-color) 10%, transparent); }
    &.inset                   { box-shadow: inset 0 2px 4px -1px var(--shadow-color); }
    &.highlighted             { /* accent bar via ::before */ }

    /* nested cards default to outlined instead of elevated */
    :where(& &)               { background: transparent; border: 1px solid …; box-shadow: none; }
  }
}
```

#### The `:where()` pattern: "apply as default"

Anything wrapped in `:where()` has **zero specificity**. Read every
`:where(...)` selector as *"this is the default look — any explicit
variant or override wins automatically."*

Two important uses:

1. **Default variant.** `:where(&), &.elevated { … }` means *"a plain
   `article` looks the same as `article.elevated`."* Authors who don't
   pick a variant get the elevated look for free, and writing
   `class="flat"` cleanly replaces it because `&.flat` has higher
   specificity than `:where(&)`.

2. **Default in context.** `:where(article article) { … border-only … }`
   means *"an article inside another article is outlined **by
   default**."* The author can still write `class="elevated"` on the
   nested card and have it win, because `&.elevated` outscores
   `:where(article article)`.

If a rule is wrapped in `:where()`, you're saying "this is just the
starting point". If it's not, you're saying "this is what this variant
*is*, and the only way to change it is another variant".

---

## 4. States

States are *not* classes. A state is anything that the platform already
exposes: a native HTML attribute, an ARIA attribute, or a CSS
pseudo-class. Always reach for these before inventing a class.

### 4.1 Canonical state hooks

| Concept           | Hook                          | Example selector                                |
| ----------------- | ----------------------------- | ----------------------------------------------- |
| Disabled          | `:disabled`, `[disabled]`     | `button:disabled { opacity: .6 }`               |
| Invalid           | `:invalid`                    | `input-shell:has(input:invalid) { outline: … }` |
| Required          | `[required]`                  | `label:has(+ input[required])::after`           |
| Busy / loading    | `[aria-busy]`                 | `empty-state.skeleton[aria-busy] { animation }` |
| Selected          | `[aria-selected="true"]`      | `[role="tab"][aria-selected="true"]`            |
| Current page      | `[aria-current="page"]`       | `a[aria-current="page"]`                        |
| Expanded          | `[aria-expanded="true"]`      | Rotated chevron                                 |
| Hover / focus     | `:hover`, `:focus-visible`    | `button:hover`, `:focus-visible { outline: … }` |
| Active / pressed  | `[aria-current]`, `[aria-selected]`, `.active` | Prefer ARIA; share styling with `.active` (see below) |
| Empty             | `:empty`, `:has()`            | `ul:empty { /* … */ }`                          |

> **The `.active` class — prefer ARIA, but support both.**
> `.active` is a near-universal class in the wild because many routers
> and component libraries toggle it automatically (e.g. `NavLink`,
> `<Tabs>`). LINS acknowledges that and styles it as a state, **but the
> preferred hooks are the platform ones**: `[aria-current="page"]` for
> "this is the current page/section" and `[aria-selected="true"]` for
> "this is the selected item in a set" (tabs, list items, segmented
> controls). Encourage authors to use those in markup.
>
> Because authors will reach for whichever is convenient, **share the
> styling** so the appearance is identical regardless of which hook
> is used. Group them on the same selector:
>
> ```css
> ul[role="tablist"] > li {
>   &[aria-selected="true"], &.active { color: var(--current-color); }
> }
>
> a[aria-current="page"], a.active { font-weight: 600; }
> ```
>
> Treat the whole group as a state, not a variant: it is *not* an
> alternate look you opt into, it is a moment in time.

### 4.2 States can augment an element

A state can also be the thing that *promotes* an element to a richer
behaviour. The most common example:

```css
article[role="button"] {
  cursor: pointer;
}
article[role="button"]:hover {
  box-shadow: 0 4px 10px -1px var(--shadow-color);
}
```

Here `[role="button"]` is not a variant of `article` — it is the state
"this card is interactive". The hover/focus rules belong with the
element, not in a `.clickable` class.

### 4.3 State rules go *with* their element

Keep state rules nested under the element they modify. Do not create
top-level `:disabled { … }` or `[aria-busy] { … }` rules — they will
collide with elements that intentionally do something different on the
same state.

---

## 5. Theme Tokens & the `--current-color` Pattern

The minimal theme defines its palette in `theme.css` and exposes it
through CSS custom properties. Every element in the theme follows the
same colour-resolution protocol.

### 5.1 The four-layer colour cascade

```
--primary-color         (palette)        ← defined once per theme
--active-color          (role)           ← set by .primary / .accent / …
--current-color         (resolved)       ← what the element actually uses
color: var(--on-current-color)
```

- **Palette tokens** (`--primary-color`, `--accent-color`, …) live on
  `.minimalTheme.light` / `.dark` etc.
- **Role classes** (`.primary`, `.accent`, …) translate a palette token
  into `--active-color` / `--on-active-color`. Defined once in
  `theme.css`, used everywhere.
- **Elements** resolve `--current-color` from `--active-color`, falling
  back to a sensible default:

  ```css
  button {
    --current-color: var(--active-color, var(--primary-color));
    --on-current-color: var(--on-active-color, var(--on-primary-color));
  }
  ```

This lets a consumer write `<button class="accent elevated">` and have
every part of the button — background, hover tint, outline, focus
ring — pick up the accent colour automatically.

### 5.2 Computed colour helpers

Prefer CSS colour functions over hand-picked shades:

- `color-mix(in oklab, var(--current-color) 15%, transparent)` for tints.
- `oklab(from var(--current-color) l a b / 0.6)` for opacity-adjusted variants.
- `oklab(from var(--current-color) 70% a b)` for lightness-adjusted outlines.

This keeps the theme parametric: changing one palette token re-derives
the whole UI.

### 5.3 Shadows

A single `--shadow-color` token drives every elevation. Stack two or
three shadows for depth rather than reaching for a stronger single
shadow:

```css
box-shadow:
  0 8px 12px -1px var(--shadow-color),
  0 4px 6px  -1px var(--shadow-color);
```

---

## 6. Context-Based Styling

Some rules only make sense in a particular parent/child relationship.
LINS uses **selectors**, not classes, to express these.

| Context selector            | Styles                                            |
| --------------------------- | ------------------------------------------------- |
| `article > hgroup`          | Card header (title + subtitle group, avatar slot) |
| `article > h3`              | Card title                                        |
| `article > section`         | Card body                                         |
| `article > footer`          | Card actions row                                  |
| `article article`           | Nested card → demoted to outlined                 |
| `section > hgroup > h*`     | Section heading (uppercase label style)           |
| `dialog > footer`           | Dialog action row                                 |
| `form > footer`             | Form action row                                   |
| `nav > ol`                  | Breadcrumb track                                  |
| `ul > *`                    | Default body-text size inside lists               |
| `input-shell input`         | Inner input reset                                 |
| `[role="radiogroup"] button`| Joined-button group                               |

### 6.1 When to use context vs a variant

- Use **context** when the relationship is already visible in the HTML
  semantics (a `footer` inside an `article` *is* the card's actions).
- Use a **variant** when the same element can appear in multiple looks
  inside the *same* context (`.elevated` vs `.outlined` card).
- Use a **state** when the difference is conditional on data
  (`[aria-busy]`, `:invalid`, `.active`).

### 6.2 Scoping rules

For variants that should only exist while the minimal theme is active,
wrap them in `@scope`:

```css
@scope (body) to (.notMinimal) {
  button.elevated { /* … */ }
}
```

This lets a sub-tree opt out by adding `class="notMinimal"`, without
fighting specificity.

---

## 7. Cascade Layers

Every minimal stylesheet uses two layers:

```css
@layer base { /* element reset: what this element IS, across every variant */ }
@layer elements { /* per-variant, per-state, per-context appearance */ }
```

Order is declared once in `theme.css`. Stick to this split:

- **`base`** — Think of this as the element's *reset*. Everything in
  here is true regardless of variant: the default `padding`,
  `border-radius`, `cursor`, `transition`, the `--current-color`
  fallback chain, the `display` mode for custom tags, and so on. If a
  declaration would have to be re-stated on every variant, it belongs
  in `base`.

- **`elements`** — Per-variant, per-state, per-context appearance.
  Anything that branches on `&.elevated`, `&[role="button"]:hover`,
  `article > footer`, etc.

Defaults outside any element file (palette, role classes) live in a
`defaults` layer in `theme.css`.

### 7.1 Layers and the utility stylesheet

The consuming app's utility framework (Tailwind, UnoCSS, …) lives in a
**higher cascade layer than `elements`**. That's why §1.1 allows the
theme to set "soft" layout: any `padding`, `display`, or `gap` the
theme provides is just a starting point, and a utility class in the
markup will win without a specificity fight.

Practical consequence: prefer setting a sensible default in the theme
over forcing every author to remember a layout utility, *as long as*
that default is genuinely unopinionated. If two designs would
reasonably disagree, leave it out.

---

## 8. File Layout for a New Theme

A theme is a folder that mirrors `style/minimal/`:

```
style/<your-theme>/
  theme.css        ← palette, role classes, @import everything below
  reset.css        ← (shared) browser reset
  button.css       ← Action elements
  card.css         ← Surface elements
  text.css         ← Typography elements
  input.css        ← Form elements
  list.css         ← List elements
  nav.css          ← Navigation elements
  popover.css      ← Overlay elements
  emptyState.css   ← Placeholder elements
  icon.css         ← Icon element
```

Each file:

1. Opens with an `@layer base` block defining the element's *baseline*.
2. Continues with an `@layer elements` block defining variants, states
   and context rules using CSS nesting.
3. Optionally wraps theme-specific rules in `@scope` so they can be
   opted out of locally.

---

## 9. Authoring Checklist

Before committing a rule, check:

- [ ] Does it set colour / type / border / shadow only? *(should be mostly yes)*
- [ ] If it sets layout (padding, `display`, `gap`, …), is that layout truly unopinionated for this element, and would a utility class still be able to override it? *(should be yes)*
- [ ] Is the selector tagged as **Element + Variant + State + Context**, with each concern using the right mechanism?
- [ ] Are "default" looks wrapped in `:where(…)` so explicit variants and overrides can win without specificity wars?
- [ ] Is the element resolved through `--current-color` / `--on-current-color` so role classes (`.primary`, `.accent`, …) work?
- [ ] Are state hooks native (`:disabled`, `[aria-busy]`, `:invalid`) instead of `.is-*` classes?
- [ ] Are context relationships expressed as selectors (`article > footer`) rather than ad-hoc classes (`.card-actions`)?
- [ ] Is the rule inside the right `@layer` — `base` for variant-agnostic resets, `elements` for everything that branches?
- [ ] For typography: is the typeface (`.display`/`.headline`/`.title`/`.body`/`.label`) composed with a size (`.small`/`.medium`/`.large`) and optionally `.variant`, rather than a fused class name?
- [ ] If the variant is new, is its name about the **look**, not the use case?

