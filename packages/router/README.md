# @web/router

A small client-side router for Solid apps. It keeps the current URL in a Solid context, exposes the path as reactive accessors, and intercepts local anchor clicks so navigation happens through the History API instead of a full page reload.

## Setup

Wrap your app in `LocationContext` near the client entry point:

```tsx
import { render } from "@solidjs/web";
import { LocationContext } from "@web/router";
import App from "./app";

render(() => (
	<LocationContext>
		<App />
	</LocationContext>
), document.getElementById("app")!);
```

All router hooks and components must be used inside this provider.

## Reading the current location

Use `useLocation()` to get reactive accessors:

```tsx
import { Match, Switch } from "solid-js";
import { useLocation } from "@web/router";

export default function App() {
	const location = useLocation();

	return (
		<Switch fallback={<div>404</div>}>
			<Match when={location.path() === "/"}>Home</Match>
			<Match when={location.segments()[0] === "editor"}>Editor</Match>
		</Switch>
	);
}
```

`location` contains:

- `path()` - the current path string.
- `segments()` - the pathname split by `/`, with empty segments removed. For `/editor/theme-1/colors`, this is `["editor", "theme-1", "colors"]`.
- `params()` - query string values as an object, for example `/search?q=blue` gives `{ q: "blue" }`.

The `theme-builder` app uses this style directly: it checks `location.segments()` inside `Switch`/`Match` branches and passes segment values such as theme ids into page scopes.

## Links

Use `A` instead of a plain `<a>` for internal navigation:

```tsx
import { A } from "@web/router";

<A href="/editor">Editor</A>
<A href={`/editor/${theme.id}/colors`}>Edit Colors</A>
```

`A` renders a normal anchor, but local left-clicks are intercepted and routed through `history.pushState`. Browser-default behavior is preserved for external URLs, modifier-clicks, non-`_self` targets, downloads, and prevented click events.

By default, `A` adds an `active` class when the link's path segments match the beginning of the current location. You can override that with `matches`:

```tsx
import { A, useLocation } from "@web/router";

const location = useLocation();

<A
	href="/editor"
	matches={() => location.segments()[0] === "editor"}
>
	Editor
</A>
```

Pass `replace` to update the current history entry instead of pushing a new one:

```tsx
<A href="/login" replace>Login</A>
```

## Programmatic navigation and redirects

Use `useNavigate()` in event handlers or async flows:

```tsx
import { useNavigate } from "@web/router";

const navigate = useNavigate();

function onBackClicked() {
	navigate("/editor/theme-1/typography");
}

function afterDelete(nextThemeId?: string) {
	navigate(nextThemeId ? `/editor/${nextThemeId}` : "/editor");
}
```

Use `Navigate` for route-level redirects:

```tsx
import { Navigate } from "@web/router";

<Match when={location.path() === "/"}>
	<Navigate to="/editor" />
</Match>
```

`Navigate` replaces the current history entry by default. Pass `replace={false}` if the redirect should push a new entry.



