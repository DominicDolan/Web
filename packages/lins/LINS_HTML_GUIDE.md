# LINS Style: HTML Usage Guide

LINS stands for **Layout Is Not Style**. This guide is for developers and agents creating HTML markup. 

The core principle is a strict separation between **Layout** (where things are) and **Style** (how things look).

## 🧩 The LINS Design Architecture

LINS organizes visual styling into three distinct layers: **Elements**, **Variants**, and **Modifiers**.

### 1. Elements (The "What")
An Element is the base structural unit. This is defined by the HTML tag, a custom tag, or a specific semantic ARIA role. 
- **Native Elements**: `button`, `input`, `article`, `h1-h6`.
- **Custom Elements**: `<empty-state>`, `<input-shell>`, `<form-field>`.
- **Semantic Elements**: `<nav aria-label="Breadcrumb">`, `<ul role="tablist">`, `<div role="button">`.

### 2. Variants (The "Look")
Variants are applied via LINS CSS classes. They define the visual "flavor" or emphasis of an element without changing its semantic meaning.
- **Surface Variants**: `.elevated`, `.flat`, `.outlined`, `.tonal`, `.inset`, `.highlighted`.
- **Action Variants**: `.elevated`, `.flat`, `.outlined`, `.text`, `.plain`, `.icon`.
- **Typography Variants**: `.displayLg`, `.headlineMd`, `.titleSm`, `.body`, `.label`.

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

- **`article` / `.card`**: The base for card-like containers.
- **Style Variants**:
    - `.elevated`: Shadowed, popping off the page.
    - `.flat`: No shadow, blends in.
    - `.outlined`: Subtle border, no fill.
    - `.tonal`: Low-opacity background of the primary color.
    - `.inset`: Recessed look (inner shadow).
    - `.highlighted`: Adds a vertical accent bar to the side.

**Interactivity**: 
To make a container interactive (e.g., a clickable card), add `role="button"`. LINS CSS handles the hover/active states (such as transition to `.tonal` or slight elevation) automatically for elements with this role. Avoid using Tailwind `hover:` utilities for LINS style changes.

**Example:**
```html
<!-- An interactive outlined card -->
<article role="button" class="outlined flex flex-col gap-4 p-6">
  ...
</article>
```

### 2. Buttons & Actions
Buttons have a strong set of built-in variants. Use the `<button>` tag or `[role="button"]`.

- **Variants**:
    - `.elevated`: High emphasis, shadowed.
    - `.flat`: High emphasis, no shadow.
    - `.outlined`: Medium emphasis, border only.
    - `.text`: Low emphasis, just text color.
    - `.plain`: Minimal emphasis, subtle hover.
    - `.icon`: Square/Circular button optimized for icons.
- **State**: Use `.active` to indicate a selected or toggled state.

**Example:**
```html
<div class="flex gap-2">
  <button class="elevated">Save Changes</button>
  <button class="outlined">Cancel</button>
  <button class="text">Reset</button>
</div>
```

### 3. Typography
Prefer semantic headings (`h1`-`h6`) or typography utility classes.

- **Headings**: `h1` through `h6` are pre-styled.
- **Role-based Typography**:
    - `.displayLg`, `.displayMd`, `.displaySm`: Large, heroic text.
    - `.headlineLg`, `.headlineMd`, `.headlineSm`: Section headers.
    - `.titleLg`, `.titleMd`, `.titleSm`: Component-level titles.
    - `.bodyLg`, `.body`, `.bodySm`: Standard reading text.
    - `.labelLg`, `.label`, `.labelSm`: Small, muted metadata/labels.

**Example:**
```html
<hgroup class="flex flex-col gap-1">
  <h2 class="titleLg">Project Settings</h2>
  <p class="bodySm label">Manage your global preferences</p>
</hgroup>
```

---

## 🏗 Structural Guidelines

### Prefer Semantic Selectors over Custom Classes
Avoid inventing classes like `.card-body` or `.nav-item`. Use the HTML structure to define the style.

- **Instead of** `<div class="card-body">` $\rightarrow$ **Use** `article > section` or `article > div`.
- **Instead of** `<div class="dialog-actions">` $\rightarrow$ **Use** `dialog > footer`.
- **Instead of** `<div class="breadcrumb-container">` $\rightarrow$ **Use** `nav[aria-label="Breadcrumb"]`.

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
- **`<input-shell>`**: A wrapper around an input and its surrounding chrome (borders, focus rings, icons, prefix/suffix).
- **`<form-field>`**: A semantic wrapper for a labeled field group (contains label, control, hint, and feedback).

**Example: Custom Tags**
```html
<form-field>
  <label>Username</label>
  <input-shell>
    <input type="text" />
  </input-shell>
</form-field>
```

### Special Attributes & States

#### Loading States (`aria-busy`)
Use the `aria-busy` attribute to indicate that an element is in a loading state. LINS CSS uses this to trigger loading animations (like shimmers).

- **Static Placeholder**: `<empty-state class="skeleton">` (Shows a gray block).
- **Loading Placeholder**: `<empty-state class="skeleton" aria-busy>` (Shows a shimmering animation).

#### Tab Lists
Use a list with the `tablist` role to define tabs.
```html
<ul role="tablist" class="flex gap-2">
  <li><button role="tab" class="flat" aria-selected="true">Tab 1</button></li>
  <li><button role="tab" class="text" aria-selected="false">Tab 2</button></li>
</ul>
```

---

## ✅ Quick Checklist for Review

- [ ] Did I use `text-`, `bg-`, `border-`, or `shadow-` Tailwind classes? **(If yes $\rightarrow$ Replace with LINS class)**
- [ ] Did I use a LINS class to set a margin, padding, or width? **(If yes $\rightarrow$ Replace with Tailwind utility)**
- [ ] Am I using a custom class where a semantic selector (e.g., `article > h3`) would work? **(If yes $\rightarrow$ Simplify)**
- [ ] Is my layout (spacing/alignment) handled entirely by utilities? **(Should be Yes)**
- [ ] Is my styling (color/font/elevation) handled entirely by LINS? **(Should be Yes)**
