import {Match, Switch} from "solid-js";
import {A, useLocation} from "@web/router";
import {FlightDetails} from "~/FlightDetails/FlightDetails";
import {FlightSearch} from "~/FlightSearch/FlightSearch";

export default function App() {
    const location = useLocation();

    return <main class="materialInspiredTheme dark min-h-screen p-6 flex flex-col gap-6">
        <Switch fallback={<NotFound />}>
            <Match when={location.segments().length === 0}>
                <FlightSearch />
            </Match>
            <Match when={location.segments()[0] === "flights"}>
                <FlightDetails flightId={location.segments()[1]} />
            </Match>
        </Switch>
    </main>;
}

function NotFound() {
    return <empty-state class="empty max-w-3xl w-full mx-auto flex flex-col items-center gap-4 p-8">
        <h1>Page not found</h1>
        <p>The route does not match a flight-search page.</p>
        <A href="/" class="flat" matches={() => false}>Back to search</A>
    </empty-state>;
}

