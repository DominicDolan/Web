# LINS Style integration to-do list

## Investigation summary

The theme-builder currently persists independently editable, event-sourced models for a theme, colours, typefaces, and element variants. It was not designed around the `LinsThemeDefinition` contract:

- `ThemeDefinition` only has `name`, `class`, `description`, and one `mode`.
- A `ColorTokenDefinition` represents one token with `hex`, `alpha`, `name`, `cssClass`, and `onHex`; it is not associated with a light/dark colour-scheme record.
- `TypefaceDefinition` has the five older app roles and separate CSS strings for default/variant and three sizes. It cannot represent LINS typography defaults/raw rules or arbitrary role-variant keys without adaptation.
- `ElementStyleDefinition` is a flat `{ element, variant, css }` model, while `ElementVariantDefinition` is `{ elementType, name, css }`. Neither captures a LINS category root, known state/part slots, selector overrides, variant default selectors, variant contexts, custom categories, or raw rules.
- The UI exposes only five hand-maintained categories (`input`, `card`, `button`, `list`, `tab`), whose identifiers/selectors do not consistently match the generator spec (`text-input`, `tab-list`, etc.). The LINS spec currently has 23 categories across 10 stylesheets.
- There is no generation/export flow, import/upload control, persisted import diagnostic state, or preview that applies a saved/generated LINS theme. `stylesheetTemplate.ts` is empty, and `ElementVariantEditor` currently supplies an empty CSS-editor value.

The LINS parser and generator are already exported by `@web/lins`. The parser consumes a *root theme stylesheet* and individual element stylesheets, returning a partial definition plus advisory warnings; it deliberately preserves recoverable arbitrary CSS as raw rules. This means the theme-builder needs an orchestration/import layer in addition to simply calling `parseLinsStylesheet` once.

---

## 1. Decide the canonical persisted representation

- [ ] Make `LinsThemeDefinition` (or a database-friendly schema with an exact, lossless mapping to it) the canonical theme representation for LINS-enabled themes.
  - Preserve `id`, `name`, `className`, optional `optOutClassName`, `description`, `colorThemes`, optional `stylesheets`, `icons`, `typography`, `categories`, and `appDefaults`.
  - Do not reduce raw CSS to a property form: the generator/parser contract requires raw CSS blocks, selector overrides, and comments (`before`/`after`) to survive a round trip.
- [ ] Decide whether the application will:
  1. replace the current split colour/typeface/element models with one versioned LINS document per theme, or
  2. retain separate event models and add a deliberate mapper/aggregate that reconstructs one `LinsThemeDefinition`.

  Option 1 is considerably simpler for import/export atomicity. Option 2 requires transactional import semantics and a clear source-of-truth rule so the models cannot drift.
- [ ] Add a `formatVersion` / `schemaVersion` and a format discriminator (for example, `format: "lins"`) so existing pre-LINS themes can be migrated or remain readable.
- [ ] Define a Zod schema mirroring the generator types rather than persisting TypeScript-only types unchecked. Include validation for CSS variable keys, `colorScheme`, stylesheet IDs, selector arrays, and raw CSS blocks.
- [ ] Define how arbitrary/custom LINS values are supported. LINS intentionally allows custom colour roles, category IDs, variant IDs, icon sizes, tokens, selectors, contexts, and raw rules; the storage schema and editor must not discard them just because they are absent from `LINS_THEME_SPEC`.
- [ ] Plan migrations and import rollback. The current generated migrations repeatedly rebuild event tables, so verify deployment/data-retention implications before changing the Zod models.

## 2. Close data-model gaps

### Theme metadata and scope

- [ ] Rename/map `ThemeDefinition.class` to generator-required `className`.
- [ ] Add `optOutClassName` (with UI support for the default `not{PascalCase(id)}` convention).
- [ ] Replace the single `mode` field with zero or more named `colorThemes`, each with `id`, `name`, `className`, `colorScheme`, optional description/comments, colours, and palette tokens.
- [ ] Add the selected/generated `stylesheets` list. A LINS root stylesheet imports the selected LINS element stylesheet IDs; it is not inferred safely from the existing five editor sections.
- [ ] Add theme-level `appDefaults`, including the `scoped` flag and at-rule support (for example, keyframes/media rules).

### Colours

- [ ] Model colours beneath a colour-scheme, not directly beneath a theme.
- [ ] Support generator colour values as either a colour only or a colour/on-colour pair, without forcing them to hex. The existing `hex` plus numeric `alpha` UI cannot faithfully represent `oklch()`, `color-mix()`, `var()`, or other valid CSS values emitted/parsed by LINS.
- [ ] Store arbitrary scheme tokens such as `--shadow-color` separately from colour roles.
- [ ] Map canonical LINS roles (`primary`, `secondary`, `surface`, `background`, `accent`, `success`, `warning`, `error`) and retain custom roles instead of treating them as invalid.
- [ ] Update colour UI to choose/edit the active light/dark scheme and support raw CSS colour expressions alongside a hex picker where possible.

### Typography and icons

- [ ] Add `typography.defaults` as a raw CSS block for root font/tokens.
- [ ] Map existing typeface records into LINS `roles`, `roleVariants`, and `sizes`, then add support for LINS `typography.raw` rules.
- [ ] Preserve `applyAsDefault` semantics as generator selector defaults; distinguish them from the current free-form typeface selector UI where necessary.
- [ ] Add an `icons` model/UI for family, `@font-face` CSS, icon-root CSS, and size values (`small`, `medium`, `large`, `xlarge`, plus custom sizes).

### Categories, variants, states, parts, and raw CSS

- [ ] Replace/extend the element model to represent every `LinsCategoryThemeDefinition` branch:
  - `stylesheetId` and `selectors` for custom categories;
  - category `root` CSS;
  - variants with `className`, `selectors`, `applyAsDefault`, CSS comments, and nested `contexts`;
  - named `states` and `parts`, including selector overrides;
  - category-level raw rules.
- [ ] Use `LINS_THEME_SPEC` as the source of truth for standard categories, selectors, state slots, part slots, typography roles, icon sizes, colour roles, and stylesheet grouping. Remove or explicitly map the duplicated `elementCategories.ts` catalogue.
- [ ] Ensure category IDs use generator IDs (`text-input`, `tab-list`, `navigation`, etc.), rather than ambiguous UI labels (`input`, `tab`).
- [ ] Add editor support for the full spec: feedback, navigation/breadcrumb, popover/dialog, empty states, icons, radio group/link/inline text, and all input types—not just the existing five sections.
- [ ] Keep a raw/advanced editor for custom categories and parser-recovered CSS that cannot be safely represented by guided forms.

## 3. Build a LINS definition adapter/service

- [ ] Create a single server-side theme aggregate service that loads a complete theme and returns a validated `LinsThemeDefinition`-compatible object.
- [ ] If retaining legacy tables, implement and test both directions:
  - legacy/event records -> LINS definition for preview/export;
  - imported LINS definition -> records/events for persistence.
- [ ] Define deterministic merge behavior for partial imports: overwrite selected branches, merge selected branches, or create a new theme. Do not silently merge parser output into an existing theme.
- [ ] Validate generator preconditions before export (required metadata, at least the intended colour schemes, valid stylesheet IDs, custom category selector requirements).
- [ ] Preserve parser warnings and source provenance during import. Warnings are advisory and should not force data loss.

## 4. Implement export/generation

- [ ] Add an export action that calls `defineLinsTheme(definition)` and emits:
  - `theme.css` from `createThemeStylesheet()`;
  - one file per selected stylesheet ID from `createStylesheet(id)`;
  - optionally a ZIP/download with the expected LINS folder layout.
- [ ] Decide whether export includes scaffold mode and spec comments. Default to production output; expose scaffold output as an explicit authoring option.
- [ ] Generate the correct filenames/import paths from `LINS_THEME_SPEC`, rather than from UI labels.
- [ ] Present generated CSS for review and allow download/copy per file.
- [ ] Add export-focused tests using a complete persisted theme fixture and compare the generated outputs with the generator contract.

## 5. Implement stylesheet upload/import

- [ ] Design the upload format and UX. A single CSS file is ambiguous: the parser needs `stylesheetId` to parse an element file, while root `theme.css` is parsed without it. Support either:
  - a ZIP/folder upload containing `theme.css` plus element files, or
  - a multi-file picker with explicit/auto-detected file roles and an editable confirmation step.
- [ ] For each uploaded file, call `parseLinsStylesheet(css, { stylesheetId, sourceId, theme })` as appropriate.
- [ ] Parse the root stylesheet first to recover metadata and its imported stylesheet list; use that list plus file names to select element parser IDs. Clearly report missing imported files and uploaded files that are not referenced.
- [ ] Merge returned partial definitions through a dedicated import assembler. The parser returns partial branches per file, so naïve object spreading will overwrite categories, typography, icons, and raw rules.
- [ ] Show a pre-save import review: recovered theme metadata, schemes/tokens, typography, icons, categories, custom/raw rules, and the full warning list grouped by source file.
- [ ] Let users resolve/accept parser warnings before committing. In particular surface malformed CSS, unknown at-rules/layers/selectors, selector drift, unknown/custom categories, and scope/stylesheet-list mismatches.
- [ ] Preserve parser-recovered `appDefaults` and raw CSS in storage/editor. Do not omit foreign but parseable CSS merely because the guided UI has no control for it.
- [ ] Decide the handling of imports that are not generated LINS CSS. The parser is best-effort, not a general CSS-to-theme semantic converter; label results as partial and keep unsupported rules as raw CSS where possible.
- [ ] Add import test fixtures for clean generated stylesheets, Aperture, partial themes, custom categories/roles, drift warnings, malformed CSS, and multiple-file merge behavior.

## 6. Update the editor and preview

- [ ] Drive navigation/category lists from `LINS_THEME_SPEC` and stylesheet groups.
- [ ] Make CSS editors read/write the persisted raw CSS. `ElementVariantEditor` currently passes `content={""}`, so element variant editing cannot affect generated output.
- [ ] Add guided editors for root/category/variant/state/part/selector/default/context fields, with raw-CSS escape hatches.
- [ ] Apply the generated theme CSS to the live preview using the current theme class and selected colour-scheme class. The app currently loads the fixed `@web/lins/minimal.css` and wraps everything in `minimal light`.
- [ ] Make previews cover the LINS categories and states they edit, including ARIA/native state hooks and context selectors, rather than only the current hard-coded examples.
- [ ] Add a scheme switcher and theme scope/opt-out preview controls.
- [ ] Ensure preview updates remain safe for malformed in-progress CSS (isolate the preview stylesheet and report parse/generation errors without losing edits).

## 7. API, validation, and regression coverage

- [ ] Expose a clear server API for load, save, export, dry-run import, and commit import; do not perform database writes directly from file-upload UI code.
- [ ] Add authorization/ownership checks and upload size/type limits before accepting stylesheets.
- [ ] Validate CSS source and generated definitions on the server; treat parser warnings separately from fatal storage/format validation errors.
- [ ] Add unit tests for the aggregate mapper, import-file assembler, and generated file manifest.
- [ ] Add integration tests covering import -> review/commit -> reload -> export -> parser round-trip semantic equivalence.
- [ ] Test that custom roles/categories/raw rules and parser comments are retained after edit/save/export.
- [ ] Verify existing themes remain usable or provide an explicit one-time migration path before enabling LINS export for them.

## Suggested implementation order

1. Finalize the canonical storage shape and migrations.
2. Implement the aggregate mapper plus LINS-definition validation.
3. Implement export and generated preview from a saved definition.
4. Replace the hand-maintained category catalogue with `LINS_THEME_SPEC` and wire existing editors to real persisted CSS.
5. Implement multi-file/ZIP import, parser orchestration, review, and commit.
6. Add advanced editing for all LINS branches and comprehensive import/export regression coverage.
