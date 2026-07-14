# Project Structure

This document describes how projects in this workspace should be organized.

The goal is to keep each page, view, and complex component easy to find, easy to extend, and easy to refactor. Prefer grouping files by the feature or UI surface they belong to instead of spreading related files across broad global folders.

## Core convention

If a page or view has enough complexity to need supporting files, it should live in its own folder.

The folder name should match the entry-point component for that page or view.

For example, a shopping cart page should be structured like this:

```txt
ShoppingCart/
  ShoppingCart.tsx
  ShoppingCartItem.tsx
  ShoppingCartScope.ts
  ShoppingCart.server.ts
```

In this example:

- `ShoppingCart/` is the folder for the page or view.
- `ShoppingCart.tsx` is the entry-point component for that folder.
- `ShoppingCartItem.tsx`, `ShoppingCartScope.ts`, and `ShoppingCart.server.ts` are supporting files that belong specifically to the shopping cart page.

## Capitalized folders

If a folder name begins with a capital letter, it represents a component, page, or view.

A capitalized folder must contain a component with the same name as the folder.

```txt
ColorEditor/
  ColorEditor.tsx
  ColorScope.ts
  ColorPalette/
	ColorPalette.tsx
```

This makes the entry point predictable: when you open `ColorEditor/`, the main component is `ColorEditor.tsx`.

Use capitalized folders for:

- Pages
- Views
- Complex feature components
- Components with multiple supporting files
- Components with feature-specific state, server functions, utilities, or child components

## Lowercase folders

If a folder name begins with a lowercase letter, it is a categorization folder.

Lowercase folders do not need to contain a same-named component. They are used to group related features, shared utilities, or broad categories.

Examples:

```txt
app/
  colors/
	ColorEditor/
	  ColorEditor.tsx
  typography/
	TypefaceEditor/
	  TypefaceEditor.tsx
  themes/
	ThemeEditor/
	  ThemeEditor.tsx

components/
  CodeEditor/
	CodeEditor.tsx

models/
  Theme.ts
  Color.ts

constants/
  DefaultTypefaces.ts
```

Use lowercase folders for:

- Feature categories, such as `colors`, `typography`, or `themes`
- Shared categories, such as `components`, `models`, `constants`, or `utils`
- Organizational folders that do not directly represent a single component entry point

## Supporting files

Keep files close to the page, view, or component that owns them.

Common supporting-file patterns include:

```txt
ExamplePage/
  ExamplePage.tsx
  ExamplePage.server.ts
  ExamplePageScope.ts
  ExamplePageRepository.server.ts
  ExamplePageUtils.ts
  ExamplePageItem.tsx
```

Suggested naming patterns:

- `*.tsx` for components and views
- `*Scope.ts` for local state, context, or scoped reactive logic
- `*.server.ts` for server-only functions
- `*Repository.server.ts` for server-side data access
- `*Utils.ts` for utilities that are specific to the page, view, or feature

If a supporting file becomes useful outside the local feature, move it to an appropriate shared lowercase folder such as `components`, `models`, `constants`, or `utils`.

## When to create a folder

A component can remain as a single file when it is simple and has no closely related supporting files.

Create a folder when any of the following are true:

- The page, view, or component has multiple child components.
- It has dedicated state or scope logic.
- It has server-side functions or repository logic.
- It has feature-specific utilities, schemas, constants, or types.
- The file is becoming large enough that splitting related code would improve readability.

## Practical example

The `theme-builder` project follows this structure. It uses lowercase feature folders such as `colors`, `typography`, `elements`, `themes`, and `contact`. Inside those categories, complex views live in capitalized folders with matching entry-point components, such as:

```txt
colors/
  ColorEditor/
	ColorEditor.tsx
	ColorScope.ts

typography/
  TypefaceEditor/
	TypefaceEditor.tsx

themes/
  ThemeEditor/
	ThemeEditor.tsx
```

It also uses lowercase shared folders such as `components`, `models`, and `constants` for broad categories that do not represent a single page or view.

## Summary

- Capitalized folder = component/page/view folder.
- Capitalized folder must contain a same-named component file.
- Lowercase folder = category or grouping folder.
- Complex pages and views should own their supporting files in the same folder.
- Keep related code close together until it is genuinely shared.

