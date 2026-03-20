# LINS Style

`LINS` means **Layout Is Not Style**.

Use utility classes (Tailwind or equivalent) for **layout only**.  
Use LINS CSS classes and theme tokens for **visual style only**.

## Rule Set (Agent-Facing)

1. Put sizing/flow/spacing in utility classes.
2. Put color/typography/border/shadow/gradient/state styling in CSS classes from `packages/lins/style/*`.
3. Do not use utility classes for visual style (`text-*`, `bg-*`, `border-*`, `shadow-*`, `font-*`, gradient/color helpers).
4. Do not use LINS style classes to control layout (`flex`, `grid`, `gap`, `p-*`, `m-*`, `w-*`, `h-*`, `absolute`, etc).
5. Style variants (`.elevated`, `.outlined`, `.flat`, `.tonal`, `.inset`, `.primary`, `.secondary`, etc.) are theme concerns, not layout concerns.

## Why

- Keeps layout decisions local to markup.
- Keeps theme decisions centralized and repeatable.
- Allows one consistent visual language across components.
- Makes large-scale theme updates cheap and predictable.

## Usage Pattern

```html
<article class="elevated flex flex-col gap-4">
  <hgroup class="flex flex-col gap-2">
    <h2>Card Title</h2>
    <p>Some subtitle</p>
  </hgroup>
  <div><p>Content of the Card</p></div>
</article>
```

- `flex flex-col gap-*` = layout.
- `elevated` (and other LINS classes) = style/theme.

## Custom tags usage guidelines
- Prefer native semantic tags first: `main`, `nav`, `aside`, `header`, `footer`, `section`, `article`, `fieldset`, `dialog`.
- Prefer selectors when the pattern is structurally meaningful:
  - nav[aria-label="Breadcrumb"]
  - dialog > footer
  - article > section
- Prefer custom tags only for reusable UI roles that stay generic:
  - feedback-message
  - input-shell
  - form-field
  - popover-host
  - popover-activator
  - toast-stack
  
## Prefer selectors over custom tags or overly specific class names when the structure is already semantic

Instead of inventing a custom tag or wrapper class for a common semantic pattern, prefer a selector that expresses the structure directly:

- Instead of `<div class="breadcrumb-container">` or `<breadcrumb-nav>`, use:
    - `nav[aria-label="Breadcrumb"]`
    - `nav > ol`

- Instead of `<div class="card-body">` or `<card-body>`, use:
    - `article > section`
    - `article > div`

- Instead of `<div class="dialog-actions">` or `<dialog-actions>`, use:
    - `dialog > footer`
    - `form > footer`

Rule of thumb:
- If the element already has a good semantic tag, use that tag plus a selector.
- Use a custom tag only when the pattern is genuinely generic, repeated, and hard to express cleanly with native HTML + selectors.



## Quick Review Checklist

- If a class changes geometry or flow, it belongs to utilities.
- If a class changes appearance, it belongs to LINS CSS.

