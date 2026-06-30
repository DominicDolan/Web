# LINS Style: HTML Usage Guide

LINS stands for **Layout Is Not Style**. This guide is for developers and agents creating HTML markup.

The core principle is a strict separation between **Layout** (where things are) and **Style** (how things look).

## 🧩 The LINS Design Architecture

LINS organizes visual styling into three distinct layers: **Element Categories**, **Variants**, and **Modifiers**.

### 1. Element Categories (The "What")
An Element Category is a group of HTML elements (or tags + roles) whose styling is shared. This is defined by the HTML tag, a custom tag, or a specific semantic ARIA role.
- **Native Tags**: `button`, `input`, `article`, `h1-h6`.
- **Custom Tags**: `<empty-state>`, `<input-shell>`, `<form-field>`.
- **Semantic Roles**: `<nav aria-label="Breadcrumb">`, `<ul role="tablist">`, `<div role="button">`.

Two pieces of markup belong to the same category when they share the same styling — the same variants, states, and visual reset. For example, `button` and `input[type=submit]` are both in the **Button** category. However, `ul` (plain list) and `ul[role="tablist"]` (tab list) are *different* categories because they style completely differently.

### 2. Variants (The "Look")
Variants are applied via LINS CSS classes. They define the visual "flavor" or emphasis of an element without changing its semantic meaning. The following are just examples of what can be used
- **Surface Variants**: `.elevated`, `.flat`, `.outlined`, `.tonal`, `.inset`, `.highlighted`, `.text`.
- **Action Variants**: `.elevated`, `.flat`, `.outlined`, `.text`, `.plain`, `.icon`.
- **List Variants**: `.nav`, `.plain`, `.menu`, `.chips`, `.underlined`, `.inset`.

### 3. Modifiers (The "State")
Modifiers change the appearance of an element based on its **state** or **context**. LINS strictly prefers native HTML attributes, ARIA states, and CSS pseudo-classes over "state classes" (e.g., avoid `.is-loading` or `.is-active`).

| Modifier Type | Trigger | Example | Effect |
| :--- | :--- | :--- | :--- |
| **Busy/Loading** | `aria-busy="true"` | `<empty-state aria-busy>` | Shimmer animation |
| **Selection** | `aria-selected` | `[role="tab"][aria-selected="true"]` | Highlighted tab |
| **Validation** | `:valid` / `:invalid` | `input:invalid` | Red border/error state |
| **Current Page** | `aria-current` | `a[aria-current="page"]` | Bold/underlined link |
| **Disabled** | `disabled` | `button:disabled` | Muted colors, no pointer |
| **Required** | `required` | `input[required]` | Required field indicator |
| **Expanded** | `aria-expanded` | `button[aria-expanded="true"]` | Rotated chevron icon |

---

## 🛠 The Golden Rule

| Concern | Tool | Examples |
| :--- | :--- | :--- |
| **Layout** | Utility Classes (Tailwind) | `flex`, `grid`, `gap-4`, `p-2`, `m-auto`, `w-full`, `absolute` |
| **Style** | LINS CSS Classes / Semantic Tags | `elevated`, `outlined`, `primary`, `button`, `article`, `h1` |

**❌ Never use utility classes for colors, typography, borders, or shadows.**
(e.g., No `text-red-500`, `bg-blue-200`, `rounded-lg`, `shadow-md`).

**❌ Never use LINS style classes for sizing or positioning.**
(e.g., No LINS classes to set `width`, `margin`, or `display: flex`).

---

## 🎨 Visual Style Patterns

### 1. Surfaces & Containers
Use semantic tags or specific LINS classes to define the "feel" of a container.

- **`article`**: The base for card-like containers.
- **Potential Style Variants**:
    - `.elevated`: Shadowed, popping off the page (typically the default).
    - `.flat`: No shadow, filled surface.
    - `.outlined`: Subtle border, no fill.
    - `.tonal`: Low-opacity background of the active colour.
    - `.inset`: Recessed look (inner shadow).
    - `.highlighted`: Adds a vertical accent bar to the side.
    - `.text`: No chrome — useful for grouped text/card semantics.

**Interactivity**:
To make a container interactive (e.g., a clickable card), add `role="button"`. LINS CSS handles the hover/active states automatically. Avoid using Tailwind `hover:` utilities for LINS style changes.

**Selection**:
Cards support `aria-selected="true"` / `aria-selected="false"` and `.active` for selected/deselected states.

**Nesting**:
A card inside another card (`article article`) automatically defaults to the outlined look. You can override this by adding an explicit variant like `.elevated`.

**Example:**
```html
<!-- An interactive outlined card -->
<article role="button" class="outlined flex flex-col gap-4 p-6">
  <hgroup>
    <h3>Project Alpha</h3>
    <p>Last updated 2 days ago</p>
  </hgroup>
  <section>Card body content here.</section>
  <footer class="flex gap-2">
    <button class="text">Details</button>
  </footer>
</article>
```

### 2. Buttons & Actions
Buttons have a strong set of built-in variants. Use the `<button>` tag or `[role="button"]`.

- **Variants**:
    - `.elevated`: High emphasis, shadowed.
    - `.flat`: High emphasis, no shadow.
    - `.outlined`: Medium emphasis, border only (typically the default).
    - `.text`: Low emphasis, just text colour.
    - `.plain`: Minimal emphasis, subtle hover.
    - `.icon`: Square/Circular button optimized for icons.
- **States**: Use `aria-pressed`, `aria-selected`, or `.active` to indicate a selected or toggled state. Prefer ARIA attributes over `.active` where possible.

**Radio Groups:**
Use `[role="radiogroup"]` to create a joined segmented button group. Child buttons use `aria-checked="true"` or `aria-selected="true"` for the selected segment.

**Example:**
```html
<div class="flex gap-2">
  <button class="elevated">Save Changes</button>
  <button class="outlined">Cancel</button>
  <button class="text">Reset</button>
  <button class="icon"><i>settings</i></button>
</div>

<!-- Segmented button group -->
<div role="radiogroup" aria-label="View mode">
  <button aria-checked="true">Grid</button>
  <button>List</button>
  <button>Table</button>
</div>
```

### 3. Typography
LINS uses a **composable type scale** based on the Material Design 3 type system. Typography is built from three independent parts:

1. **Role** — the typeface purpose: `.display`, `.headline`, `.title`, `.body`, `.label`.
2. **Size** — the relative scale: `.small`, `.medium`, `.large`.
3. **`.variant`** — an optional modifier for muted/secondary text.

These are composed together as separate classes. Order does not matter.

| Role | Purpose |
| :--- | :--- |
| `.display` | Hero / marketing-sized text |
| `.headline` | Page and section headers |
| `.title` | Component / card titles |
| `.body` | Standard reading text |
| `.label` | Small metadata, captions, form labels, chip text |

**Example:**
```html
<h1 class="display large">Welcome</h1>
<p class="title medium">Project Settings</p>
<p class="body small variant">Last updated 2 days ago</p>
```

#### The `.variant` Modifier
Add `.variant` to any typography role for a muted/secondary treatment. Common uses:

- Subtitles under a heading.
- The label half of a label/value pair.
- Captions and metadata.

```html
<hgroup class="flex flex-col gap-1">
  <h2 class="headline medium">Inbox</h2>
  <p class="headline small variant">3 unread messages</p>
</hgroup>

<dl class="flex gap-4">
  <dt class="label medium variant">Status</dt>
  <dd class="label medium">Active</dd>
</dl>
```

#### Bare Headings
Bare `h1`–`h6` elements are automatically mapped onto the type scale with sensible defaults. You do not need to add classes unless you want to override the default. Context also influences the default mapping:

| Context | Default role |
| :--- | :--- |
| `h1`, `h2` (page-level) | `.display` |
| `section > h*`, `section > hgroup > h*` | `.headline` |
| `article > h*`, `dialog > h*`, `empty-state > h*` | `.title` |
| `article > hgroup > p`, `dialog > hgroup > p` | `.title.variant` |
| `section > hgroup > p` | `.headline.variant` |
| Paragraphs, list items, inputs | `.body` |
| Buttons, tabs, nav links, labels | `.label` |
| Breadcrumbs, `small`, `time`, `figcaption`, validation output | `.label.variant` |

### 4. Lists
Lists have several variant forms beyond plain `ul`/`ol`.

- **`ul.nav`**: A navigation-style list with hover and active states on items. Use when a list of links is not a `<nav>` landmark.
- **`ul.plain`**: A styled list with no bullets.
- **`ul.menu` / `ul[role="menu"]`**: A floating menu surface, usually paired with a popover.
- **`ul.chips`**: A set of inline chip/tag items.
- **`ul[role="tablist"]`**: Horizontal tabs (see Tab Lists below).

**Active/current state on list items:**
Use `aria-current="page"`, `aria-selected="true"`, or `.active` on `li` elements. LINS also supports these states on child links via `:has()`.

**Example:**
```html
<!-- Navigation list -->
<ul class="nav flex flex-col gap-1">
  <li aria-current="page"><a href="/dashboard">Dashboard</a></li>
  <li><a href="/settings">Settings</a></li>
  <li><a href="/profile">Profile</a></li>
</ul>

<!-- Chip list -->
<ul class="chips flex gap-2">
  <li>TypeScript</li>
  <li>CSS</li>
  <li>HTML</li>
</ul>
```

### 5. Tab Lists
Use a `ul` with `role="tablist"` to define tabs. Selection state goes on the `li` (or its child) via `aria-selected` or `.active`.

**Variants:**
- Default: standard tab appearance.
- `.underlined`: Underline indicator on the selected tab.
- `.inset`: Recessed segmented-tab container with a pill indicator.

```html
<ul role="tablist" class="flex gap-2">
  <li aria-selected="true">Overview</li>
  <li aria-selected="false">Details</li>
  <li aria-selected="false">History</li>
</ul>

<!-- Underlined tabs -->
<ul role="tablist" class="underlined flex gap-2">
  <li aria-selected="true">Overview</li>
  <li aria-selected="false">Details</li>
</ul>
```

### 6. Icons
Use the `<i>` tag for icons. The icon font family is set by the theme (e.g., Material Symbols).

**Size classes:** `.small`, `.medium` (default), `.large`, `.xlarge`.

```html
<i>home</i>
<i class="large">settings</i>
<button class="icon"><i>close</i></button>
```

---

## 🏗 Structural Guidelines

### Prefer Semantic Selectors over Custom Classes
Avoid inventing classes like `.card-body` or `.nav-item`. Use the HTML structure to define the style.

- **Instead of** `<div class="card-body">` → **Use** `article > section`.
- **Instead of** `<div class="card-actions">` → **Use** `article > footer`.
- **Instead of** `<div class="dialog-actions">` → **Use** `dialog > footer`.
- **Instead of** `<div class="form-actions">` → **Use** `form > footer`.
- **Instead of** `<div class="breadcrumb-container">` → **Use** `nav[aria-label="Breadcrumb"]`.

**Example: Card with structural context hooks**
```html
<article class="elevated">
  <hgroup>
    <h3>Project Alpha</h3>
    <p>Subtitle text here</p>
  </hgroup>
  <section>
    <p>Card body content styled automatically.</p>
  </section>
  <footer class="flex gap-2">
    <button class="text">Cancel</button>
    <button class="flat">Save</button>
  </footer>
</article>
```

**Example: Breadcrumbs**
```html
<nav aria-label="Breadcrumb">
  <ol class="flex gap-2">
    <li><a href="/">Home</a></li>
    <li><a href="/blog">Blog</a></li>
    <li><a href="/blog/css" aria-current="page">CSS Tricks</a></li>
  </ol>
</nav>
```

### When to use Custom Tags
Use custom tags for highly reusable, generic UI roles that cannot be expressed with native HTML.

- **`<empty-state>`**: A placeholder/skeleton/empty visual slot. Used when content is loading, missing, or being reserved in layout.
- **`<input-shell>`**: A wrapper around an input and its surrounding chrome (borders, focus rings, icons, prefix/suffix). Styled identically to a native `input`.
- **`<form-field>`**: A semantic wrapper for a labeled field group (contains label, control, hint, and feedback via `output`).

**Example: Form with custom tags**
```html
<form-field>
  <label>Username</label>
  <input-shell>
    <input type="text" required />
  </input-shell>
  <output></output>
</form-field>
```

### Colour Roles
Use colour-role classes to change an element's active colour. These translate palette tokens into the element's colour without changing its variant.

Available roles: `.primary`, `.secondary`, `.accent`, `.success`, `.warning`, `.error`, `.surface`, `.background`.

```html
<button class="flat accent">Save</button>
<button class="outlined error">Delete</button>
<article class="tonal warning">
  <h3>Quota Warning</h3>
  <p>You are approaching your storage limit.</p>
</article>
```

### Special Attributes & States

#### Loading States (`aria-busy`)
Use the `aria-busy` attribute to indicate that an element is in a loading state. LINS CSS uses this to trigger loading animations (like shimmers).

- **Static Placeholder**: `<empty-state class="skeleton">` (Shows a grey block).
- **Loading Placeholder**: `<empty-state class="skeleton" aria-busy>` (Shows a shimmering animation).
- **Empty Content**: `<empty-state class="empty">` (Dashed-border "nothing here" panel with optional heading and body text).

```html
<!-- Loading skeleton -->
<empty-state class="skeleton" aria-busy>
  <div class="h-4 w-3/4"></div>
  <div class="h-4 w-1/2"></div>
</empty-state>

<!-- Empty content message -->
<empty-state class="empty flex flex-col items-center gap-4 p-8">
  <h3>No results found</h3>
  <p>Try adjusting your search filters.</p>
</empty-state>
```

#### Navigation
Use `nav` with context classes for different navigation roles:
- **`nav.top`**: Top app-bar navigation.
- **`nav.pageNav`** or **`aside > nav`**: Vertical sidebar navigation.
- **`nav[aria-label="Breadcrumb"]`**: Breadcrumb trail.

Mark the current link with `aria-current="page"` or `.active`.

```html
<nav class="top flex items-center gap-4 px-4">
  <h1>My App</h1>
  <a href="/docs">Docs</a>
  <a href="/blog" aria-current="page">Blog</a>
</nav>
```

#### Dialogs
Use the native `<dialog>` element. Place action buttons in `dialog > footer`.

```html
<dialog>
  <hgroup>
    <h3>Confirm Deletion</h3>
    <p>This action cannot be undone.</p>
  </hgroup>
  <section>
    <p>Are you sure you want to delete this item?</p>
  </section>
  <footer class="flex gap-2 justify-end">
    <button class="text">Cancel</button>
    <button class="flat error">Delete</button>
  </footer>
</dialog>
```

#### Popovers / Menus
Use the `popover` attribute with `role="menu"` or `.menu` for floating panels.

```html
<ul popover role="menu">
  <li role="menuitem">Edit</li>
  <li role="menuitem">Duplicate</li>
  <li role="menuitem">Delete</li>
</ul>
```

---

## ✅ Quick Checklist for Review

- [ ] Did I use `text-`, `bg-`, `border-`, or `shadow-` Tailwind classes? **(If yes → Replace with LINS class or colour role)**
- [ ] Did I use a LINS class to set a margin, padding, or width? **(If yes → Replace with Tailwind utility)**
- [ ] Am I using a custom class where a semantic selector (e.g., `article > h3`) would work? **(If yes → Simplify)**
- [ ] Is my layout (spacing/alignment) handled entirely by utilities? **(Should be Yes)**
- [ ] Is my styling (color/font/elevation) handled entirely by LINS? **(Should be Yes)**
- [ ] Am I composing typography from separate role + size + variant classes (e.g., `class="headline small variant"`) rather than fused names (e.g., ~~`headlineSm`~~)? **(Should be Yes)**
- [ ] Am I using ARIA attributes (`aria-selected`, `aria-current`, `aria-busy`, `disabled`) for states instead of custom `.is-*` classes? **(Should be Yes)**
