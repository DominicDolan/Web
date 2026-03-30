import {
    Accessor,
    createContext,
    createMemo,
    createSignal,
    JSX,
    onSettled,
    useContext
} from "solid-js";

const LocationContextProvider = createContext<{
    location: {
        path: Accessor<string>,
        segments: Accessor<string[]>,
        params: Accessor<Record<string, string>>
    },
    navigate: (to: string, replace?: boolean) => void
}>();

export function LocationContext(props: { children: any }) {
    const [path, setPath] = createSignal(window.location.pathname);

    const handleLocationChange = () => setPath(window.location.pathname);

    onSettled(() => {
        window.addEventListener("popstate", handleLocationChange);

        return () => window.removeEventListener("popstate", handleLocationChange)
    })

    const url = createMemo(() => new URL(path(), window.location.origin))
    const params = createMemo(() => Object.fromEntries(url().searchParams.entries()))

    const segments = createMemo(() => {
        return url().pathname.split('/').filter(segment => segment !== '');
    })

    const navigate = (to: string, replace: boolean = false) => {
        if (replace) {
            window.history.replaceState({}, "", to);
        } else {
            window.history.pushState({}, "", to);
        }

        setPath(to);
    };

    const location = {
        path,
        segments,
        params,
    };

    return <LocationContextProvider value={{location, navigate}}>{props.children}</LocationContextProvider>
}

interface AProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    replace?: boolean;
}


function isExternalHref(href: string): boolean {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
}

export function A(props: AProps) {
    const { replace: _replace, onClick: _onClick, href: _href, ...anchorProps } = props;

    const navigate = useNavigate();

    const userOnClick = props.onClick as JSX.EventHandler<HTMLAnchorElement, MouseEvent> | undefined;

    const onClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> = (event) => {
        userOnClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (props.target != null && props.target !== "_self") return;
        if (props.download != null) return;

        const target = props.href;
        if (isExternalHref(target)) return;

        event.preventDefault();
        navigate(target, props.replace ?? false);
    };
    return (
        <a
            {...anchorProps}
            href={props.href}
            onClick={onClick}
        />
    );
}

export function Navigate(props: { to: string, replace?: boolean }) {
    const navigate = useNavigate();
    onSettled(() => {
        navigate(props.to, props.replace ?? true);
    })
    return <></>;
}

export function useLocation() {
    const context = useContext(LocationContextProvider)
    if (context == null) {
        throw new Error("useRoute must be used within a LocationContextProvider")
    }
    return context.location;
}

export function useNavigate() {
    const context = useContext(LocationContextProvider)
    if (context == null) {
        throw new Error("useNavigate must be used within a LocationContextProvider")
    }
    return context.navigate;
}
