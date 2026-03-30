import "virtual:uno.css"
import "@web/lins/minimal.css"
import ContactUs from "~/app/contact/ContactUs/ContactUs"
import ThemeEditor from "~/app/themes/ThemeEditor/ThemeEditor"
import ThemeSettings from "~/app/themes/ThemeEditor/ThemeSettings";
import {createSignal, JSX, lazy, Match, onSettled, Switch} from "solid-js";
import ColorEditor, {preloadColors} from "~/app/themes/ColorEditor/ColorEditor";
import ElementsEditor from "~/app/elements/ElementsEditor";

// export default function App() {
//     return (
//         <Router
//             root={(props: any) => <><nav>Nav Bar</nav><div>{props.children}</div></>}
//         >
//             <Route path={["/editor", "/"]} component={ThemeEditor}>
//                 <Route path={"/"}></Route>
//                 <Route path={"/:themeId?"} component={ThemeSettings}>
//                     <Route path={"/"} component={() => <Navigate href={"colors"}/>}/>
//                     <Route path={"/colors"} component={ColorEditor} preload={preloadColors}/>
//                 </Route>
//             </Route>
//             <Route path={"/editor/:themeId/elements"} component={ElementsEditor}></Route>
//             <Route path={"/editor/:themeId/fonts"} component={lazy(() => import("~/app/themes/FontsEditor/FontsEditor"))}></Route>
//             <Route path={"/contact"} component={ContactUs} info={{title: "Contact Us"}}/>
//         </Router>
//     )
// }

function TestComponent() {
    return <div>Test as '/test'</div>
}

function Home() {
    return <h1>Home</h1>
}


interface AProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    replace?: boolean;
}

function isExternalHref(href: string): boolean {
    return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
}

function A(props: AProps & { navigate?: (href: string, replace?: boolean) => void}) {

    const { replace: _replace, onClick: _onClick, href: _href, ...anchorProps } = props;

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
        props.navigate?.(target, props.replace ?? false);
    };
    return (
        <a
            {...anchorProps}
            href={props.href}
            onClick={onClick}
        />
    );
}

export default function App() {
    const [path, setPath] = createSignal(window.location.pathname);

    const handleLocationChange = () => setPath(window.location.pathname);

    onSettled(() => {
        window.addEventListener("popstate", handleLocationChange);

        return () => window.removeEventListener("popstate", handleLocationChange)
    })

    // 3. Simple helper for internal navigation
    const navigate = (to: string, replace: boolean = false) => {
        if (replace) {
            window.history.replaceState({}, "", to);
        } else {
            window.history.pushState({}, "", to);
        }
        setPath(to);
    };
    return (
        <div>
            <nav>
                <A href="/" navigate={navigate}>Home</A><A href="/test" navigate={navigate}>Test</A><A href="/test-route" navigate={navigate}>Test Again</A>
            </nav>
            <Switch>
                <Match when={path() === "/"}>
                    <ThemeEditor></ThemeEditor>
                </Match>
                <Match when={path() === "/test" || path() === "/test-route"}>
                    <TestComponent></TestComponent>
                </Match>
            </Switch>
        </div>
    )
}
