import {
  children,
  createComponent,
  createContext,
  createMemo,
  createSignal,
  createTrackedEffect,
  onCleanup,
  useContext,
  type Accessor,
  type Component,
  type JSX
} from "solid-js";

export type RouteParams = Record<string, string | undefined>;

export interface RouteLocation {
  pathname: string;
  search: string;
  hash: string;
  href: string;
}

export interface RouteSectionProps<TInfo = unknown, TParams extends RouteParams = RouteParams> {
  params: TParams;
  location: RouteLocation;
  info?: TInfo;
  children?: JSX.Element;
}

export interface RoutePreloadFuncArgs<TParams extends RouteParams = RouteParams> {
  params: TParams;
  location: RouteLocation;
  intent: "initial" | "navigate";
}

export type RoutePreloadFunc<TParams extends RouteParams = RouteParams> =
  (args: RoutePreloadFuncArgs<TParams>) => unknown | Promise<unknown>;

export interface RouteProps<TInfo = unknown> {
  path: string | readonly string[];
  component?: Component<RouteSectionProps<TInfo>>;
  preload?: RoutePreloadFunc;
  info?: TInfo;
  children?: JSX.Element;
}

export interface RouterProps {
  root?: Component<{ children?: JSX.Element }>;
  fallback?: JSX.Element;
  children?: JSX.Element;
}

export interface NavigateOptions {
  replace?: boolean;
}

export type NavigateFunction = (to: string | number, options?: NavigateOptions) => void;

export interface NavigateProps {
  href: string;
  replace?: boolean;
}

export interface AProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
}

const ROUTE_DEFINITION = Symbol("route-definition");

interface RouteDefinition {
  [ROUTE_DEFINITION]: true;
  paths: string[];
  component?: Component<any>;
  preload?: RoutePreloadFunc;
  info?: unknown;
  children: RouteDefinition[];
}

type PathToken =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string; optional: boolean };

interface BranchEntry {
  route: RouteDefinition;
  tokens: PathToken[];
}

interface Branch {
  order: number;
  componentDepth: number;
  entries: BranchEntry[];
}

interface BranchMatch {
  branch: Branch;
  params: RouteParams;
  consumedByEntry: string[][];
  staticSegments: number;
  dynamicSegments: number;
  optionalSkips: number;
}

interface MatchedRouteEntry {
  route: RouteDefinition;
  baseSegments: string[];
}

interface RouteMatch {
  order: number;
  params: RouteParams;
  staticSegments: number;
  dynamicSegments: number;
  optionalSkips: number;
  componentDepth: number;
  branchDepth: number;
  entries: MatchedRouteEntry[];
  componentEntries: MatchedRouteEntry[];
}

interface RouterContextValue {
  location: Accessor<RouteLocation>;
  navigate: NavigateFunction;
  isProvided: boolean;
}

interface RouteRenderContextValue {
  baseSegments: string[];
  isProvided: boolean;
}

const RouterContext = createContext<RouterContextValue>({
  location: () => readLocation(),
  navigate: () => undefined,
  isProvided: false
});

const RouteRenderContext = createContext<RouteRenderContextValue>({
  baseSegments: [],
  isProvided: false
});

function isRouteDefinition(value: unknown): value is RouteDefinition {
  if (typeof value !== "object" || value === null) return false;
  return ROUTE_DEFINITION in value;
}

function normalizeRoutePath(path: string): string {
  const pathWithoutSearch = path.trim().split(/[?#]/, 1)[0] ?? "";
  if (pathWithoutSearch === "" || pathWithoutSearch === "/") return "/";
  const withLeadingSlash = pathWithoutSearch.startsWith("/") ? pathWithoutSearch : `/${pathWithoutSearch}`;
  const withoutTrailingSlash = withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : withLeadingSlash;
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

function normalizeRoutePaths(path: string | readonly string[]): string[] {
  if (typeof path === "string") return [normalizeRoutePath(path)];
  if (path.length === 0) return ["/"];
  return Array.from(path, (entry) => normalizeRoutePath(entry));
}

function collectRouteDefinitions(value: unknown): RouteDefinition[] {
  const collected: RouteDefinition[] = [];
  collectRouteDefinitionsInto(value, collected);
  return collected;
}

function collectRouteDefinitionsInto(value: unknown, collected: RouteDefinition[]): void {
  if (value == null || value === false) return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRouteDefinitionsInto(item, collected);
    }
    return;
  }

  if (isRouteDefinition(value)) {
    collected.push(value);
  }
}

function splitPathSegments(pathname: string): string[] {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") return [];
  return normalized
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
}

function parseTokens(path: string): PathToken[] {
  return splitPathSegments(path).map((segment): PathToken => {
    if (!segment.startsWith(":")) {
      return { kind: "static", value: segment };
    }

    const rawParam = segment.slice(1);
    const optional = rawParam.endsWith("?");
    const name = optional ? rawParam.slice(0, -1) : rawParam;

    if (name.length === 0) {
      return { kind: "static", value: segment };
    }

    return { kind: "param", name, optional };
  });
}

function countComponents(entries: BranchEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.route.component != null) count += 1;
  }
  return count;
}

function buildBranches(routes: RouteDefinition[]): Branch[] {
  const branches: Branch[] = [];
  let order = 0;

  const walk = (route: RouteDefinition, parentEntries: BranchEntry[]) => {
    for (const path of route.paths) {
      const nextEntries = [...parentEntries, { route, tokens: parseTokens(path) }];
      if (route.children.length === 0) {
        branches.push({
          order,
          componentDepth: countComponents(nextEntries),
          entries: nextEntries
        });
        order += 1;
        continue;
      }

      for (const child of route.children) {
        walk(child, nextEntries);
      }
    }
  };

  for (const route of routes) {
    walk(route, []);
  }

  return branches;
}

interface EntryMatchState {
  nextSegmentIndex: number;
  params: RouteParams;
  consumedSegments: string[];
  staticSegments: number;
  dynamicSegments: number;
  optionalSkips: number;
}

function matchEntryTokens(
  tokens: PathToken[],
  pathSegments: string[],
  segmentStart: number,
  existingParams: RouteParams
): EntryMatchState[] {
  const states: EntryMatchState[] = [];

  const walk = (
    tokenIndex: number,
    segmentIndex: number,
    params: RouteParams,
    consumedSegments: string[],
    staticSegments: number,
    dynamicSegments: number,
    optionalSkips: number
  ) => {
    if (tokenIndex >= tokens.length) {
      states.push({
        nextSegmentIndex: segmentIndex,
        params,
        consumedSegments,
        staticSegments,
        dynamicSegments,
        optionalSkips
      });
      return;
    }

    const token = tokens[tokenIndex];
    if (token.kind === "static") {
      const segment = pathSegments[segmentIndex];
      if (segment == null || segment !== token.value) return;
      walk(
        tokenIndex + 1,
        segmentIndex + 1,
        params,
        [...consumedSegments, segment],
        staticSegments + 1,
        dynamicSegments,
        optionalSkips
      );
      return;
    }

    const segment = pathSegments[segmentIndex];
    if (segment != null) {
      const existingValue = params[token.name];
      if (existingValue == null || existingValue === segment) {
        const nextParams = existingValue === segment ? params : { ...params, [token.name]: segment };
        walk(
          tokenIndex + 1,
          segmentIndex + 1,
          nextParams,
          [...consumedSegments, segment],
          staticSegments,
          dynamicSegments + 1,
          optionalSkips
        );
      }
    }

    if (token.optional) {
      walk(
        tokenIndex + 1,
        segmentIndex,
        params,
        consumedSegments,
        staticSegments,
        dynamicSegments,
        optionalSkips + 1
      );
    }
  };

  walk(0, segmentStart, existingParams, [], 0, 0, 0);
  return states;
}

function compareBranchMatchQuality(next: BranchMatch, current: BranchMatch): number {
  if (next.staticSegments !== current.staticSegments) {
    return next.staticSegments - current.staticSegments;
  }
  if (next.dynamicSegments !== current.dynamicSegments) {
    return next.dynamicSegments - current.dynamicSegments;
  }
  if (next.optionalSkips !== current.optionalSkips) {
    return current.optionalSkips - next.optionalSkips;
  }
  if (next.branch.componentDepth !== current.branch.componentDepth) {
    return next.branch.componentDepth - current.branch.componentDepth;
  }
  if (next.branch.entries.length !== current.branch.entries.length) {
    return next.branch.entries.length - current.branch.entries.length;
  }
  return current.branch.order - next.branch.order;
}

function matchBranch(branch: Branch, pathSegments: string[]): BranchMatch | undefined {
  let best: BranchMatch | undefined;

  const walk = (
    entryIndex: number,
    segmentIndex: number,
    params: RouteParams,
    consumedByEntry: string[][],
    staticSegments: number,
    dynamicSegments: number,
    optionalSkips: number
  ) => {
    if (entryIndex >= branch.entries.length) {
      if (segmentIndex !== pathSegments.length) return;
      const candidate: BranchMatch = {
        branch,
        params,
        consumedByEntry,
        staticSegments,
        dynamicSegments,
        optionalSkips
      };
      if (best == null || compareBranchMatchQuality(candidate, best) > 0) {
        best = candidate;
      }
      return;
    }

    const entry = branch.entries[entryIndex];
    const matches = matchEntryTokens(entry.tokens, pathSegments, segmentIndex, params);
    for (const match of matches) {
      walk(
        entryIndex + 1,
        match.nextSegmentIndex,
        match.params,
        [...consumedByEntry, match.consumedSegments],
        staticSegments + match.staticSegments,
        dynamicSegments + match.dynamicSegments,
        optionalSkips + match.optionalSkips
      );
    }
  };

  walk(0, 0, {}, [], 0, 0, 0);
  return best;
}

function compareRouteMatchQuality(next: RouteMatch, current: RouteMatch): number {
  if (next.staticSegments !== current.staticSegments) {
    return next.staticSegments - current.staticSegments;
  }
  if (next.dynamicSegments !== current.dynamicSegments) {
    return next.dynamicSegments - current.dynamicSegments;
  }
  if (next.optionalSkips !== current.optionalSkips) {
    return current.optionalSkips - next.optionalSkips;
  }
  if (next.componentDepth !== current.componentDepth) {
    return next.componentDepth - current.componentDepth;
  }
  if (next.branchDepth !== current.branchDepth) {
    return next.branchDepth - current.branchDepth;
  }
  return current.order - next.order;
}

function createRouteMatch(candidate: BranchMatch): RouteMatch {
  const entries: MatchedRouteEntry[] = [];
  const prefix: string[] = [];

  for (let i = 0; i < candidate.branch.entries.length; i += 1) {
    const entry = candidate.branch.entries[i];
    prefix.push(...candidate.consumedByEntry[i]);
    entries.push({
      route: entry.route,
      baseSegments: [...prefix]
    });
  }

  const componentEntries = entries.filter((entry) => entry.route.component != null);
  return {
    order: candidate.branch.order,
    params: candidate.params,
    staticSegments: candidate.staticSegments,
    dynamicSegments: candidate.dynamicSegments,
    optionalSkips: candidate.optionalSkips,
    componentDepth: candidate.branch.componentDepth,
    branchDepth: candidate.branch.entries.length,
    entries,
    componentEntries
  };
}

function findBestRouteMatch(branches: Branch[], pathname: string): RouteMatch | undefined {
  const pathSegments = splitPathSegments(pathname);
  let best: RouteMatch | undefined;

  for (const branch of branches) {
    const candidate = matchBranch(branch, pathSegments);
    if (candidate == null) continue;

    const next = createRouteMatch(candidate);
    if (best == null || compareRouteMatchQuality(next, best) > 0) {
      best = next;
    }
  }

  return best;
}

function normalizePathname(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash.length <= 1) return "/";
  const withoutTrailingSlash = withLeadingSlash.replace(/\/+$/, "");
  return withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;
}

function isExternalHref(href: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
}

function normalizeInternalHref(href: string): string {
  const resolved = new URL(href, "http://solid-router.local");
  const pathname = normalizePathname(resolved.pathname);
  return `${pathname}${resolved.search}${resolved.hash}`;
}

function resolveHref(href: string, baseSegments: string[]): string {
  const trimmed = href.trim();
  if (trimmed === "") return "/";
  if (isExternalHref(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return normalizeInternalHref(trimmed);

  const basePath = baseSegments.length === 0 ? "/" : `/${baseSegments.join("/")}`;
  const baseUrl = (trimmed.startsWith("?") || trimmed.startsWith("#"))
    ? `http://solid-router.local${basePath}`
    : `http://solid-router.local${basePath.endsWith("/") ? basePath : `${basePath}/`}`;
  const resolved = new URL(trimmed, baseUrl);
  return `${normalizePathname(resolved.pathname)}${resolved.search}${resolved.hash}`;
}

function readLocation(): RouteLocation {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "", hash: "", href: "/" };
  }

  const pathname = normalizePathname(window.location.pathname);
  const search = window.location.search;
  const hash = window.location.hash;
  return {
    pathname,
    search,
    hash,
    href: `${pathname}${search}${hash}`
  };
}

function renderMatch(match: RouteMatch, location: RouteLocation): JSX.Element {
  let nestedView: JSX.Element = null;

  for (let index = match.componentEntries.length - 1; index >= 0; index -= 1) {
    const entry = match.componentEntries[index];
    const component = entry.route.component;
    if (component == null) continue;

    const sectionProps: RouteSectionProps = {
      params: match.params,
      location,
      info: entry.route.info,
      children: nestedView
    };

    nestedView = (
      <RouteRenderContext value={{ baseSegments: entry.baseSegments, isProvided: true }}>
        {createComponent(component, sectionProps)}
      </RouteRenderContext>
    );
  }

  return nestedView;
}

export function Route(props: RouteProps): JSX.Element {
  const resolvedChildren = children(() => props.children);
  const paths = createMemo(() => normalizeRoutePaths(props.path));
  const nestedRoutes = createMemo(() => collectRouteDefinitions(resolvedChildren()));

  const definition: RouteDefinition = {
    [ROUTE_DEFINITION]: true,
    get paths() {
      return paths();
    },
    get component() {
      return props.component;
    },
    get preload() {
      return props.preload;
    },
    get info() {
      return props.info;
    },
    get children() {
      return nestedRoutes();
    }
  };

  return definition as unknown as JSX.Element;
}

export function Router(props: RouterProps): JSX.Element {
  const resolvedChildren = children(() => props.children);
  const routes = createMemo(() => collectRouteDefinitions(resolvedChildren()));
  const branches = createMemo(() => buildBranches(routes()));

  const [location, setLocation] = createSignal<RouteLocation>(readLocation());
  const navigate: NavigateFunction = (to, options) => {
    if (typeof window === "undefined") return;

    if (typeof to === "number") {
      window.history.go(to);
      return;
    }

    const href = to.trim();
    if (href === "") return;

    if (isExternalHref(href)) {
      if (options?.replace) {
        window.location.replace(href);
      } else {
        window.location.assign(href);
      }
      return;
    }

    const normalizedTarget = normalizeInternalHref(href);
    const current = location();
    if (normalizedTarget === current.href) return;

    if (options?.replace) {
      window.history.replaceState(null, "", normalizedTarget);
    } else {
      window.history.pushState(null, "", normalizedTarget);
    }
    setLocation(readLocation());
  };

  if (typeof window !== "undefined") {
    const onPopState = () => {
      setLocation(readLocation());
    };

    window.addEventListener("popstate", onPopState);
    onCleanup(() => {
      window.removeEventListener("popstate", onPopState);
    });
  }

  const match = createMemo(() => findBestRouteMatch(branches(), location().pathname));

  let didRunInitialPreload = false;
  createTrackedEffect(() => {
    const currentMatch = match();
    if (currentMatch == null) return;

    const intent: "initial" | "navigate" = didRunInitialPreload ? "navigate" : "initial";
    didRunInitialPreload = true;
    const preloadArgs: RoutePreloadFuncArgs = {
      params: currentMatch.params,
      location: location(),
      intent
    };

    for (const entry of currentMatch.entries) {
      if (entry.route.preload == null) continue;
      void entry.route.preload(preloadArgs);
    }
  });

  return (
    <RouterContext value={{ location, navigate, isProvided: true }}>
      <InnerRouter root={props.root} match={match()} location={location()} fallback={props.fallback} />
    </RouterContext>
  );
}

function InnerRouter(props: { root: any, match: any, location: any, fallback?: any }) {
  const routedView = createMemo(() => {
    const currentMatch = props.match;
    if (currentMatch == null) return props.fallback ?? null;
    return renderMatch(currentMatch, props.location);
  });

  const rootView = createMemo(() => {
    if (props.root == null) return routedView();
    return createComponent(props.root, { children: routedView() });
  })

  return <>{rootView()}</>
}

export function Navigate(props: NavigateProps): JSX.Element {
  const router = useContext(RouterContext);
  const renderContext = useContext(RouteRenderContext);

  createTrackedEffect(() => {
    if (!router.isProvided) return;
    const baseSegments = renderContext.isProvided
      ? renderContext.baseSegments
      : splitPathSegments(router.location().pathname);
    const target = resolveHref(props.href, baseSegments);
    router.navigate(target, { replace: props.replace ?? true });
  });

  return null;
}

export function A(props: AProps): JSX.Element {
  const router = useContext(RouterContext);
  const renderContext = useContext(RouteRenderContext);
  const baseSegments = createMemo(() => {
    if (renderContext.isProvided) return renderContext.baseSegments;
    if (router.isProvided) return splitPathSegments(router.location().pathname);
    return [];
  });
  const resolvedHref = createMemo(() => resolveHref(props.href, baseSegments()));
  const userOnClick = props.onClick as JSX.EventHandler<HTMLAnchorElement, MouseEvent> | undefined;

  const onClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> = (event) => {
    userOnClick?.(event);
    if (event.defaultPrevented) return;
    if (!router.isProvided) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (props.target != null && props.target !== "_self") return;
    if (props.download != null) return;

    const target = resolvedHref();
    if (isExternalHref(target)) return;

    event.preventDefault();
    router.navigate(target, { replace: props.replace ?? false });
  };

  const { replace: _replace, onClick: _onClick, href: _href, ...anchorProps } = props;
  return (
    <a
      {...anchorProps}
      href={resolvedHref()}
      onClick={onClick}
    />
  );
}
