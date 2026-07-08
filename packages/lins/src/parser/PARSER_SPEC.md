# LINS Stylesheet Parser Spec

This document specifies how `parseLinsStylesheet` (`linsThemeParser.ts`) should
work. The parser is the **inverse** of `createStylesheet` /
`createThemeStylesheet` in `../generator/themeDefinition.ts`: given raw CSS
text that was (or claims to have been) produced by the generator, it should
reconstruct as much of the original `LinsThemeDefinition` as it safely can,
and report a `warnings` list describing anything it could not map back
losslessly, anything it had to guess at, and anything that looks like
hand-authored drift from the LINS conventions.

The parser must **never throw** for malformed or foreign CSS. Every failure
mode is expressed as a warning attached to the returned `LinsParsedStylesheet`,
and the parser always returns the best-effort partial `definition` it could
build. This mirrors the generator's own leniency (empty optional fields are
simply omitted) and makes the parser usable as a linter/import tool for CSS
that a human has since hand-edited.

---

## 1. Inputs and outputs

```ts
parseLinsStylesheet(css: string, options?: LinsStylesheetParseOptions): LinsParsedStylesheet
```

- **`css`** — the full text of either:
  - a *theme stylesheet* (output of `createThemeStylesheet`, i.e.
    `@import` lines, an optional description comment, an optional
    `@font-face`, and a single `@layer defaults { … }` block), or
  - an *element stylesheet* (output of `createStylesheet(id)`, i.e. an
    optional `@layer defaults { … }` for typography root tokens, followed
    by `@layer elements { @scope (body) to (.notXyz) { … } }`).
- **`options.stylesheetId`** — when provided, the parser knows which
  `LinsStylesheetSpec` (and therefore which `LinsElementCategorySpec`
  subset) to match selectors against. When omitted, the parser assumes it
  is reading the *root theme stylesheet* (palette + icon font-face +
  typography defaults only — no category rules are expected there).
- **`options.theme`** — metadata that cannot be *reconstructed* from CSS
  alone (`id`, `name`, `optOutClassName` when it doesn't follow the
  `not{PascalId}` convention, `description` when the same text could
  plausibly be a different comment, `stylesheets`). The parser uses this
  only to disambiguate and to detect drift (e.g. the CSS's `@scope (...)
  to (.actualOptOutClass)` doesn't match `theme.optOutClassName`); it
  does not require it to function.
- **Returns `{ definition, warnings }`.** `definition` is a
  `Partial<LinsThemeDefinition>` containing only the branches the parser
  found evidence for — it is designed to be spread/merged into a real
  `defineLinsTheme(...)` call or diffed against one, **not** assumed to be
  a complete, valid `LinsThemeDefinition` on its own.

### 1.1 What "round-trip" means

For CSS produced by the generator with default options (no
`includeSpecComments`, `mode: "production"`), re-running
`createStylesheet(id)` (or `createThemeStylesheet()`) on
`definition` merged over the original theme input should produce
produce a **byte-for-byte-equivalent CSS modulo whitespace** — not necessarily
identical to the original input, because the parser does not need to
preserve incidental formatting, only semantic content
(selectors, declaration values, comments attached via `before`/`after`).

The parser is **not required** to preserve:
- Declaration order within a raw `css` block (it may be normalized).
- Blank lines and indentation.
- Whether a `:where(...)` default selector was written before or after
  the explicit selector (selector list order inside one rule can be
  reordered internally, but see §5.6 for the visible-order it must
  reconstruct into `variant.selectors`).

The parser **is required** to preserve:
- Every literal CSS declaration's property/value text, verbatim, inside
  the `css` string it assigns to a `LinsRawCssBlock`.
- Comments that sit immediately before/after a generated rule, mapped to
  `before`/`after` (see §5.8).
- The distinction between which selectors were the "default" (`:where(...)`
  wrapped) and which were explicit.

---

## 2. Pipeline overview

1. **Tokenize/parse the CSS into an AST.** Use a real CSS parser (e.g. a
   CSS-nesting-aware parser) rather than regex. The AST must retain:
   comments, at-rule preludes (`@layer name`, `@scope (...) to (...)`,
   `@media (...)`, `@font-face`), selector lists (each individual
   selector, not just the raw comma-joined string), and nested rules
   (`&.foo { … }`) as children rather than flattening them.
2. **Classify top-level nodes**: `@import`, block comment, `@font-face`,
   `@layer defaults`, `@layer elements`. Anything else at the top level is
   an `unknown-at-rule` (at-rule) or `unknown-selector` (bare rule)
   warning, and is skipped for structural parsing (but see §6.4 — it may
   still be captured as a candidate `raw` rule).
3. **Within `@layer defaults`** (root stylesheet mode): match the theme
   root class rule, color-scheme rules, color-role rules, and
   `appDefaults` unscoped rules. (Element-stylesheet mode instead expects
   only the `:root { --font-size: ...; }` typography-defaults rule here,
   plus any raw typography rules with a `@media`-like top-level selector.)
4. **Within `@layer elements` → `@scope (root) to (optOut)`**: match
   typography role/role-variant/size rules, icon size rules, and one rule
   per element category. Anything inside the scope block that isn't
   consumed by these matchers becomes an `appDefaults` raw rule (scoped)
   or an `unknown-selector` warning if it can't be safely captured (see
   §6).
5. **Within a matched category rule's body**: split nested rules into
   variant rules, state rules, part rules, and leftover raw rules,
   using the category's `LinsElementCategorySpec` (when the category id
   is recognized) to disambiguate; fall back to structural heuristics for
   unrecognized ("custom") categories.
6. **Assemble `definition`** from everything matched, and **assemble
   `warnings`** from everything that had to be guessed, ignored, or
   flagged as drift.

Steps 3–5 are independent per top-level construct, so a malformed rule in
one category must not prevent other categories from parsing successfully
— **isolate failures per rule**, not per stylesheet.

---

## 3. Selector normalization

Before comparing a CSS selector (or selector list) against a spec
selector, the parser must normalize both sides the same way, so that
cosmetic differences never produce a mismatch:

- Collapse all whitespace runs to a single space; trim.
- Normalize attribute selectors: `[type=button]` ≡ `[type="button"]` ≡
  `[type='button']`; case-insensitive attribute *names*, case-sensitive
  attribute *values* (HTML attribute values in these selectors are
  case-sensitive tokens like `button`, `radiogroup`, `page`).
- Normalize combinator spacing: `article>footer` ≡ `article > footer`.
- Normalize pseudo-class function argument spacing:
  `:not( [disabled] )` ≡ `:not([disabled])`.
- Treat a comma-separated selector list as a **set**, not a sequence —
  `a, b` ≡ `b, a` (the generator does not guarantee emission order,
  and hand-edited CSS may reorder them for readability).
- Selector lists that use `&`-nesting should be desugared relative to the
  enclosing rule before comparison (e.g. `&:hover` inside `button { … }`
  desugars to `button:hover`), so a nested-CSS author and a
  flat-CSS author produce the same comparison key.

This normalization is used everywhere selectors are compared: category
selectors, state/part slot selectors, variant selectors, typography
default-selector lists, and icon `applyAsDefault` selectors.

---

## 4. Matching selectors to spec entities

### 4.1 Category matching

For a rule at the top level of `@layer elements … @scope`, the parser
computes its normalized selector **set** and compares it against every
`LinsElementCategorySpec.selectors` set (restricted to categories whose
`stylesheetId` matches `options.stylesheetId`, when known):

- **Exact set match** → matched, no warning.
- **Superset match** (rule's selectors ⊇ spec selectors, with extra
  selectors left over) → matched as that category, **and** the leftover
  selectors are extracted into a synthetic sibling category entry (see
  §6.1) with an `ambiguous-selector-superset` warning, since the extra
  selector(s) may belong to a different (possibly custom) category that
  was merged into the same rule by hand.
- **Subset match** (rule's selectors ⊊ spec selectors — some expected
  selectors are simply missing) → matched as that category with a
  `partial-category-selectors` warning listing which spec selectors were
  not present. This is common when a theme only implements *some* of a
  category's tags (e.g. only `button`, not the `input[type=...]`
  siblings) — the parser still recovers the category, but callers should
  know the selector list was narrowed.
- **No overlap with any spec category for this stylesheet** → the rule
  is treated as a **custom category** (see §4.4) if it looks
  structurally like a category rule (has nested `&`-rules or looks like a
  reset block), otherwise it is folded into `raw`.
- **Overlaps with more than one spec category** (e.g. a hand-merged rule
  combining `button` and `a` selectors) → split per §6.1, plus an
  `ambiguous-category-match` warning naming every candidate category id,
  since the parser must guess which category should "own" any shared
  root declarations.

Two *different* rules that each exactly match the *same* category's
selector set (i.e. the same category is defined twice in one
stylesheet, which the generator itself never emits) produce a
`duplicate-category-definition` warning; the parser merges their bodies
in file order (later declarations win, matching normal CSS cascade
semantics within the same layer/scope) rather than discarding either.

### 4.2 Variant matching

Inside a matched category rule, each nested rule is a variant candidate.
The parser reconstructs `variantId`, `className`, `selectors`,
`default`, and `applyAsDefault` as follows:

1. Split the nested rule's selector list into those wrapped in
   `:where(...)` and those that are not (after `&`-desugaring against the
   category root).
2. Any *non-`:where`* selector of the exact shape `&.<class>` (optionally
   combined with `:not(...)` exclusions applied by the generator to
   *other* variants — see step 4 below) identifies the variant's
   `className`. If there is no such selector (all selectors are custom,
   e.g. `&[data-icon]`), the parser cannot recover a `className` and must
   derive `variantId` from context (see §4.2.1) and always emit
   `selectors` explicitly (skipping `className` inference), flagging an
   `inferred-variant-id` warning since the id is a guess, not a certainty.
3. Any `:where(...)` selector that is *only* `&` with a `:not(<other
   classes>)` chain (i.e. matches the shape produced by
   `getDefaultVariantSelector`) marks `default: true` for this variant.
   The parser should verify (best-effort) that the excluded class names
   in that `:not()` chain equal the *other* sibling variants' class
   names; a mismatch (extra/missing excluded classes) is captured as a
   `stale-default-exclusion` warning rather than blocking the match,
   since it likely indicates the CSS is out of sync with a variant that
   was added/removed by hand after the `:where()` was last generated.
4. Any other `:where(...)` selector (not matching the `:not()`-chain
   shape) is treated as an `applyAsDefault` entry, verbatim.
5. If the rule declares only `:where(...)` selectors and no `&.<class>`
   selector at all, the variant has no discoverable class name; it is
   emitted with `selectors` populated (from the raw `&`-rules found) and
   an `unnamed-variant` warning.

#### 4.2.1 Variant id inference

`variantId` is, by construction, only recoverable when it equals
`className` (the common case — the generator defaults `className` to
`variantId`). When a nested rule's `&.<class>` selector's class differs
from every *object key* the parser can otherwise infer (there are none —
CSS carries no object keys), the parser **must use the CSS class name as
the `variantId`** and rely on the round-trip test only checking
`className` implicitly matches. This is a known, accepted asymmetry:
**the parser can only recover `variant.className` explicitly when the
class name looks non-identifier-like as a variant id** (contains
characters invalid in a JS object key without quoting, e.g. a class name
starting with a digit) — in the common case it infers `variantId ===
className` and omits the redundant `className` field, since re-generating
from that inferred id produces identical CSS.

### 4.3 State and part matching

Nested rules that are neither `:where(...)`-bearing (variant) rules nor
plain declaration-only rules are compared against
`category.spec.states` and `category.spec.parts` selector-slot lists
using the same set-based matching as §4.1:

- Exact selector-set match against a named slot → matched to that
  `stateId`/`partId`.
- No slot matches, but the rule's selector(s) start with `&` (i.e. still
  scoped to this category) → treated as a **custom** state/part. The
  parser cannot know whether the author intended it as a `states` or
  `parts` entry (the *only* semantic difference upstream is which object
  key it's placed under — both render identically via `renderSlotRule`),
  so it defaults to `parts` (the more permissive bucket, since not every
  part is state-like) and emits a `custom-part-inferred` warning so a
  human can move it into `states` if that's a better fit.
- A rule's selector partially overlaps a known slot (e.g. spec state
  `hover` is `&:hover:not(:disabled):not([disabled])` but the CSS only
  has `&:hover:not(:disabled)`) → matched to that slot with a
  `selector-drift` warning including both the expected and actual
  selector text, since this is exactly the "selectors being slightly
  off" case called out for this spec.
- The `selector` override field (`LinsRawCssBlock.selector`) is always
  populated on the returned block when the actual selector differs *at
  all* from the spec's default for that slot (even a normalized-equal
  but textually-different selector such differing attribute quoting is
  **not** re-emitted as an override — only genuine content drift is).

### 4.4 Custom categories

A rule that does not match any known category for the target stylesheet,
but is structured like one (has a selector list, and its body is a mix
of declarations and/or nested `&`-rules) is captured as a custom category
entry:

```ts
{
    stylesheetId: options.stylesheetId, // required, since it can't be inferred otherwise
    selectors: [...],                    // the rule's own selector list, verbatim
    root: { css: "..." },
    variants: { ... }, states: { ... }, parts: { ... }, // parsed the same as §4.2/4.3, with no spec slots to match against, so *everything* nested is bucketed as a "part" unless it has a `:where` variant shape
}
```

An `unrecognized-category` warning is always attached (informational,
not an error) so a caller knows this category id was invented by the
parser (using a slugified form of its first selector, e.g.
`chip-token` → `chip-token`) rather than read from real config, and
should be renamed to something meaningful.

### 4.5 Typography, icon, and color-role matching

- **Typography roles/role-variants/sizes** are matched the same way as
  variants (§4.2) but against `LINS_THEME_SPEC.typography.*` instead of
  a category's variants: the `:where(defaultSelectors)` half is compared
  against the spec's `defaultSelectors` (superset/subset drift produces
  `partial-typography-defaults` / `extra-typography-defaults` warnings
  analogous to §4.1's category superset/subset handling), and the
  `.<role|size>` class selector identifies which role/size/role-variant
  is being defined. A `.role.variant` compound class (e.g.
  `.display.variant`) is matched against `roleVariants` before falling
  back to treating `.variant` as an unknown bare class.
- **Icon sizes** are matched by their `i.<class>` selector against
  `LINS_ICON_SPEC.sizes`; the `applyAsDefault` selectors are recovered
  from any accompanying `:where(...)` selectors, same as §4.2 step 4.
  An icon rule whose class doesn't match any known `LinsIconSizeId`
  produces an `unrecognized-icon-size` warning but is still captured
  under that literal class name (icon sizes support free-form string
  keys the same as categories do via `Partial<Record<LinsIconSizeId |
  string, string>>` — actually the icons definition is `Record<..., string>`,
  a single font-size value, so the parser must also verify the rule body
  is *exactly* `font-size: <value>;` and nothing else; extra
  declarations in an icon-size rule produce an
  `unsupported-icon-declaration` warning and are dropped from the
  recovered value, since `LinsThemeIconDefinition.sizes` has no room for
  extra CSS).
- **Color roles** are recovered from two places: the theme root/color
  scheme rule's custom properties (`--primary-color`, `--on-primary-color`,
  …) matched against `LINS_COLOR_ROLE_SPECS[].cssVariable`/`onCssVariable`,
  and the standalone `.primary { --active-color: var(--primary-color); … }`
  role-alias rules. A custom color role (CSS variable name that doesn't
  match any spec role, e.g. `--brand-tertiary-color`) is still captured
  (via the same kebab-case convention `getColorRole` uses in reverse) with
  an `unrecognized-color-role` warning.

---

## 5. Reconstructing the theme root (theme stylesheet mode only)

When `options.stylesheetId` is omitted, the parser targets the shape
produced by `createThemeStylesheet`:

1. Leading `@import` lines become nothing in `definition` directly (they
   are re-derived by the generator from `theme.stylesheets`), but the
   parser cross-checks them: if the set of imported stylesheet ids
   doesn't match `options.theme.stylesheets` (or "all stylesheets" when
   that's undefined), it emits a `stylesheet-list-mismatch` warning
   naming the extra/missing stylesheet ids, and reconstructs
   `definition.stylesheets` from the imports it actually saw (since the
   imports are the source of truth for what CSS actually exists on disk).
2. A block comment immediately after the imports becomes
   `definition.description`.
3. An `@font-face` block becomes `definition.icons.fontFaceCss`.
4. Inside `@layer defaults`:
   - The `.{className}` rule (matching `theme.className` when provided,
     otherwise the only single-class top-level rule in the layer) yields
     `--icon-font-family` → `icons.family`, and any other raw
     declarations/blocks → `typography.defaults` / `icons.css` by
     matching known synthetic markers (see §5.1) or, failing that,
     `unrecognized-theme-root-declaration` warning with the content kept
     as an `appDefaults` raw rule scoped to that selector so it isn't
     silently dropped.
   - `.{className}.{colorSchemeClassName}` rules become
     `colorThemes[]` entries; `color-scheme: light|dark;` is required to
     recover `colorScheme` — its absence produces a
     `missing-color-scheme-declaration` warning and the entry defaults to
     `"light"`.
   - Bare `.{roleId}` rules (`--active-color`/`--on-active-color` pair)
     confirm color roles referenced by name; a role id present here but
     never used in any `colorThemes[].colors` is fine (the generator
     always emits all spec roles regardless of use), so this alone is
     **not** a warning.
   - Anything else in `@layer defaults` becomes `appDefaults` (unscoped).

### 5.1 Disambiguating `typography.defaults` vs `icons.css` vs stray root CSS

Both `theme.typography.defaults.css` and `theme.icons.css.css` are
inlined as raw, unlabelled declarations inside the same `.{className}`
rule (see `renderThemeRootRule`). The parser **cannot** distinguish them
from CSS content alone. It should:

- Attempt to classify each top-level declaration/nested-block by
  whether it looks like a typography custom property
  (`--font-size`, `--base-font-size`, `font-family`, …) vs an icon
  concern (`font-variation-settings`, anything mentioning `Material
  Symbols` or `--icon-*`), using a conservative keyword heuristic.
- Anything that cannot be confidently classified is placed into
  `typography.defaults` (first) as the more common of the two, and an
  `ambiguous-theme-root-declaration` warning is emitted so a human
  confirms the split. This is a fundamentally lossy boundary and should
  be documented as such wherever this parser's limitations are discussed.

---

## 6. Recovering `appDefaults` and unmatched content

### 6.1 Leftover selectors from a superset category match

When §4.1 detects a superset match, the leftover selector(s) are not
discarded. The parser creates (or amends) an `appDefaults` raw-rule entry
scoped appropriately, using the *actual* declarations shared with the
matched category's root (duplicated, since CSS doesn't let the parser
split "which declaration was meant for which selector" any more finely
than the whole rule allows) — this is intentionally conservative:
**prefer over-attributing shared CSS to both possible owners over
silently dropping a selector.**

### 6.2 Unknown at-rules

Any at-rule the parser doesn't recognize (`@layer` names other than
`defaults`/`elements`, `@scope` preludes that don't match `(rootSelector)
to (.optOutClassName)`, `@container`, unrecognized `@media` at the wrong
nesting depth, etc.) produces an `unknown-at-rule` warning with the
at-rule prelude text in `atRule`. Its *contents*, if they parse as valid
rules, are still walked recursively for category/typography/icon matches
(so a stray `@media (min-width: 40rem) { button { ... } }` still lets the
inner `button` rule be attributed, with the `@media` wrapper noted in the
warning) — only the wrapper itself is "unknown", not necessarily
everything inside it.

### 6.3 Unknown layer

A `@layer` block whose name is neither `defaults` nor `elements` (e.g. a
consuming app's own `@layer utilities { ... }`) produces a single
`unknown-layer` warning per distinct unexpected layer name and its
contents are **not** walked further (utility layers are explicitly out
of LINS's scope per `LINS_STYLE.md` §7.1) — this avoids false-positive
`unknown-selector` warnings for every utility class in a large Tailwind
build.

### 6.4 Unknown selector / malformed rule

- A rule at a position where the parser expected a category/typography/
  icon/color-role match, but whose selector matches **none** of the
  above and doesn't look like a plausible custom category (§4.4) —
  e.g. a one-off selector with no nested rules and declarations that
  don't resemble LINS conventions — produces an `unknown-selector`
  warning with the selector text, and the rule's raw text is preserved
  as an `appDefaults` entry (scoped, matching its position) so nothing is
  silently lost even when the parser can't explain *what* it is.
- A block that fails to parse as valid CSS at all (unbalanced braces,
  garbage tokens the CSS parser itself rejects) produces a
  `malformed-rule` warning containing the raw source slice, and parsing
  resumes at the next recoverable rule boundary (typically the next
  top-level `}` at nesting depth 0). The parser must never abort the
  entire file because one rule is broken.
- A declaration whose property is recognized as a LINS convention but
  whose value looks structurally wrong for that convention — e.g.
  `color-scheme: banana;` instead of `light`/`dark`, or a
  `--font-size-multiplier` that isn't a plain number/percentage/`calc()`
  — produces an `unsupported-declaration` warning (with `css` set to the
  offending declaration) but the declaration's raw text is still kept
  verbatim in the surrounding `css` block, since LINS deliberately allows
  arbitrary CSS inside these blocks and the parser should not be a strict
  CSS validator, only flag suspicious-looking values as a courtesy.

---

## 7. Full warning code taxonomy

This expands `LinsStylesheetParseWarningCode` beyond the current 6
values. Each entry lists the trigger and the fields the parser should
populate on `LinsStylesheetParseWarning` (`selector`, `atRule`, `css`
apply as documented on the interface; `message` is always a
human-readable summary).

| Code                              | Cause |
|-----------------------------------|-------|
| `unknown-at-rule`                 | A top-level (or nested) at-rule the parser doesn't recognize (§6.2). |
| `unknown-layer`                   | A `@layer` whose name isn't `defaults`/`elements` (§6.3). |
| `unknown-scope`                   | An `@scope (...) to (...)` prelude that doesn't match `(rootSelector) to (.optOutClassName)` — either the root selector or opt-out class differs from spec/theme metadata. |
| `unknown-selector`                | A rule whose selector matches no known category/slot/typography/icon/color-role entity and doesn't look like a valid custom category (§6.4). |
| `unsupported-declaration`         | A declaration matches a known LINS custom-property/at-rule convention but has a value that looks structurally invalid (§6.4). |
| `malformed-rule`                  | A block that fails to parse as syntactically valid CSS (§6.4). |
| `ambiguous-category-match`        | A rule's selector set overlaps more than one category spec (§4.1). |
| `ambiguous-selector-superset`     | A rule matches a category's full selector set plus additional, unexplained selectors (§4.1). |
| `partial-category-selectors`      | A rule matches only a subset of a category's spec selector set (§4.1). |
| `duplicate-category-definition`   | The same category id/selector set is defined more than once in one stylesheet (§4.1). |
| `unrecognized-category`           | A rule was captured as a plausible **custom** category not present in `spec.ts` (§4.4). |
| `inferred-variant-id`             | A variant's id had to be derived from its class name because no other signal was available (§4.2). |
| `unnamed-variant`                 | A variant rule has no `&.<class>` selector at all, only `:where(...)` defaults (§4.2 step 5). |
| `stale-default-exclusion`         | A `:where(&:not(...))` default selector's excluded class list doesn't match the sibling variants actually present (§4.2 step 3). |
| `custom-part-inferred`            | A nested rule inside a category didn't match a known state/part slot and was bucketed under `parts` by default (§4.3). |
| `selector-drift`                  | A matched slot/category/variant's actual selector text differs in content (not just formatting) from the spec default (§4.3, generalized to any slot type). |
| `partial-typography-defaults`     | A typography role/size/role-variant's `:where(...)` default-selector list is a subset of the spec's list (§4.5). |
| `extra-typography-defaults`       | A typography role/size/role-variant's `:where(...)` default-selector list has selectors beyond the spec's list (§4.5). |
| `unrecognized-icon-size`          | An icon-size rule's class doesn't match any `LinsIconSizeId` (§4.5). |
| `unsupported-icon-declaration`    | An icon-size rule has declarations beyond a single `font-size` value (§4.5). |
| `unrecognized-color-role`         | A `--*-color`/`.role` pair doesn't match any spec color role (§4.5). |
| `stylesheet-list-mismatch`        | The theme root's `@import` list doesn't match `options.theme.stylesheets` (§5). |
| `missing-color-scheme-declaration`| A color-scheme rule is missing its `color-scheme: light|dark;` declaration (§5). |
| `unrecognized-theme-root-declaration` | Content in the theme root `.{className}` rule couldn't be attributed to icons/typography (§5). |
| `ambiguous-theme-root-declaration`| A theme-root declaration was heuristically, not certainly, classified as typography vs icon CSS (§5.1). |
| `opt-out-class-mismatch`          | The `@scope (...) to (...)` opt-out class doesn't match `theme.optOutClassName` (derivable alongside `unknown-scope`, but kept distinct because the scope *shape* is otherwise valid — only the class name differs). |
| `empty-rule-body`                 | A rule matched a known category/slot but has no declarations and no nested rules at all (nothing to recover) — informational, since the generator itself never emits truly empty rules (`emitEmptyScaffoldRules` only omits them), so this usually means hand-editing left a dead rule behind. |

All codes are advisory. None of them should cause the parser to omit an
otherwise-recoverable piece of `definition` — the only things dropped
entirely from `definition` are byte ranges the parser truly cannot parse
as CSS at all (paired with `malformed-rule`).

---

## 8. Edge cases checklist

This section enumerates concrete scenarios the parser's test suite should
cover, grouped by theme.

### 8.1 Selector drift ("slightly off" selectors)

- Extra/missing `:not(...)` clauses on a state selector (e.g. spec's
  hover state excludes both `:disabled` and `[disabled]`, but the CSS
  only excludes one) → `selector-drift`, still matched.
- Reordered attribute selectors in a multi-attribute tag (e.g.
  `input[type=button]` vs a hypothetical `input[disabled][type=button]`)
  → normalize and compare as an unordered attribute set on the same
  tag/type before falling back to `selector-drift`.
- Quote style differences (`[type=button]` vs `[type='button']` vs
  `[type="button"]`) → **not** drift; fully normalized away (§3).
- Whitespace-only differences around combinators/pseudo-classes → **not**
  drift; fully normalized away (§3).
- A category selector list missing one of several expected tags (e.g.
  `button, input[type=button]` present but `input[type=submit]`,
  `input[type=reset]`, `input[type=image]` absent) →
  `partial-category-selectors`, still matched as `button`.
- A category rule additionally includes a selector for a *different*,
  legitimate spec category by mistake (e.g. `button` rule's selector list
  accidentally also includes `a`) → `ambiguous-category-match` (two spec
  categories, `button` and `link`, both partially overlap), and the
  parser should prefer attributing the rule to whichever spec category
  has the **larger selector-set overlap**, moving the smaller-overlap
  selector(s) to a synthetic superset/leftover entry.

### 8.2 Two selectors referring to the same category

- The same logical category (e.g. `button`) is unintentionally
  hand-split into two separate top-level rules with disjoint selector
  subsets (e.g. one rule for `button` and a separate rule for
  `input[type=button]`, each with their own, slightly different variant
  bodies) — this is **not** the same as `duplicate-category-definition`
  (which is for *identical* selector sets). The parser should:
  1. Recognize both rules individually match subsets of the same spec
     category (`partial-category-selectors` on each).
  2. Merge their bodies into a single `categories.button` entry (variant/
     state/part maps merged by key; a key present in both rules with
     *different* CSS content is a conflict — see next bullet).
  3. Emit a `split-category-rule` **only if `partial-category-selectors`
     didn't already fire for both** — otherwise the partial-selector
     warnings already communicate the split, and a second warning would
     be redundant. *(If this scenario needs its own distinct code because
     the two partial matches individually don't convey "these two rules
     are actually one logical category", add `split-category-rule` to
     the taxonomy in §7 and always emit it alongside the two partials —
     implementers should pick whichever reads more clearly in practice
     and keep the warning list free of duplicate signal for the same
     root cause.)*
- Two rules matching the same category with **conflicting** declarations
  for the same variant/state/part id (e.g. both define `flat` but with
  different `css`) → merge in file order (later wins, §4.1) and emit
  `duplicate-category-definition` noting the conflicting key.

### 8.3 Missing / extra structural wrappers

- Element stylesheet CSS missing the outer `@scope (...) to (...)`
  entirely (all category rules sit directly in `@layer elements`) →
  `unknown-scope` is **not** right here since there's no scope prelude at
  all to mis-parse; instead this should be a distinct
  `missing-scope-wrapper`-style situation — treat it as: still parse the
  category rules found directly under `@layer elements` (best-effort
  recovery), but emit `unknown-scope` with `atRule` describing the
  layer itself, since structurally the expected wrapper is absent. (Reuse
  `unknown-scope` rather than adding a new code, since the caller-facing
  actionable info — "the scope wrapper looks wrong" — is the same.)
- `@layer defaults` entirely absent from an element stylesheet that
  `includesTypography` — fine, not a warning: typography defaults
  (`:root` block) are optional (only emitted when
  `theme.typography.defaults.css` is non-empty).
- `@layer defaults` **present** in an element stylesheet that does *not*
  include typography (e.g. `stylesheetId: "button"`) → `unknown-selector`
  or `unrecognized-theme-root-declaration`-style handling is overkill;
  instead emit `unsupported-declaration`-adjacent — actually the cleanest
  answer: treat any `@layer defaults` found where none is expected as
  `unknown-at-rule` scoped to that specific occurrence, since it's
  structurally out of place for the given `stylesheetId`, and still
  attempt to parse its contents as if it were theme-root content (best
  effort), reusing §5's matchers.

### 8.4 Typography ambiguity

- A `.display.variant` rule where only `.variant` half is present
  without a role class at all (e.g. someone wrote a bare `.variant { … }`
  utility) → cannot map to any `LinsTypographyRoleVariantId`; captured
  as `typography.raw` with an `unknown-selector` warning, not silently
  merged into an arbitrary role.
- `.small`/`.medium`/`.large` classes reused outside typography context
  (e.g. a `.small` on a component that isn't a typography size rule,
  such as an icon `.small`) — disambiguate by checking the enclosing
  selector: `i.small` belongs to icons (§4.5), a bare top-level
  `.small { ... }` belongs to typography sizes, anything else (e.g.
  `button.small`) is out of LINS's typography/icon scope entirely and
  should be treated as a category variant candidate first (§4.2) before
  ever considering typography.

### 8.5 Theme-level edge cases

- `optOutClassName` following the exact `not{PascalId}` convention needs
  no warning even when `options.theme` is omitted (derivable from `id`
  alone); it only becomes `opt-out-class-mismatch` when
  `options.theme.optOutClassName` is explicitly provided **and**
  disagrees with what's in the CSS.
- A theme stylesheet with **zero** `colorThemes` rules (all color
  tokens live only in `:root` rather than a `.theme.scheme` pair) is
  valid CSS but not a valid LINS theme stylesheet — still parse whatever
  color-role alias rules exist, but note the absent color-scheme rules
  are simply absent from `definition.colorThemes` (empty array), with no
  warning required (`colorThemes` is a required field on
  `LinsThemeDefinition`, but the *parser's* job is to describe what it
  found, not to validate the result is a complete, buildable theme —
  that validation belongs to whatever consumes `definition` next).
- Multiple `@font-face` blocks (e.g. `woff2` + `woff` fallback split
  across two blocks) → concatenate them into `icons.fontFaceCss`
  verbatim (the generator only ever emits the single string the theme
  author supplied, so round-tripping multiple blocks back into one
  string is correct, not lossy).

### 8.6 Whitespace-only / cosmetic CSS that must never warn

To keep signal-to-noise high, the parser must **not** warn for any of
the following, since they carry no semantic difference from generator
output:
- Trailing semicolons, or their absence, on the last declaration in a
  block.
- `\r\n` vs `\n` line endings.
- Extra blank lines between rules.
- Single-line vs multi-line comments with identical text content.
- A `@scope` prelude written as `@scope(body) to(.notFoo)` (no space
  after `@scope`/before `to`) vs the generator's `@scope (body) to
  (.notFoo)` — normalize at-rule prelude whitespace the same as selector
  whitespace (§3).

---

## 9. Testing strategy

`linsThemeParser.test.ts` already establishes the round-trip contract
using `test.fails(...)` placeholders (the parser is currently a stub).
As the implementation lands, tests should be added incrementally per
section above, each initially skipped/`.fails` until that piece of the
pipeline exists, in roughly this order (matching the pipeline in §2):

1. Theme root parsing (§5) — palette, color schemes, icon font-face.
2. Category parsing for a "clean" stylesheet with no drift (§4.1–§4.4).
3. Typography and icon parsing (§4.5).
4. Warning-producing fixtures, one focused fixture per code in §7 —
   prefer small, single-purpose fixtures (one drifted selector, one
   unknown at-rule, etc.) over one giant "kitchen sink" fixture per
   stylesheet, so a regression in one matcher doesn't mask assertions
   about another.
5. The combined "recovers parseable generated rules alongside foreign
   CSS" fixture already present in the test file, extended to also cover
   §6.2 (unknown at-rule survives with inner content still parsed) and
   §8.3 (missing `@scope` wrapper).

Golden-file/snapshot testing (asserting `warnings` deep-equals an
expected array, and `definition` matches the theme's own config via
`toMatchObject`) is preferred over asserting on the CSS string, since CSS
string output is the generator's concern, not the parser's.


