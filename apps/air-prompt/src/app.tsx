import {Match, Show, Switch, createSignal} from "solid-js";
import {A, useLocation} from "@web/router";
import {FlightDetails} from "~/FlightDetails/FlightDetails";
import {FlightSearch} from "~/FlightSearch/FlightSearch";
import {runOpenRouterProof, type OpenRouterProofResult} from "~/OpenRouterProof.server";

export default function App() {
    const location = useLocation();
    const [openRouterLoading, setOpenRouterLoading] = createSignal(false);
    const [openRouterError, setOpenRouterError] = createSignal<string>();
    const [openRouterProof, setOpenRouterProof] = createSignal<OpenRouterProofResult>();

    async function onRunOpenRouterProof() {
        setOpenRouterLoading(true);
        setOpenRouterError(undefined);

        try {
            setOpenRouterProof(await runOpenRouterProof());
        } catch (caught) {
            setOpenRouterProof(undefined);
            setOpenRouterError(caught instanceof Error ? caught.message : "Unable to run the OpenRouter proof right now.");
        } finally {
            setOpenRouterLoading(false);
        }
    }

    return <main class="materialInspiredTheme dark min-h-screen p-6 flex flex-col gap-6">
        <section class="max-w-7xl w-full mx-auto elevated p-5 flex flex-col gap-3">
            <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <hgroup>
                    <h2>OpenRouter proof</h2>
                    <p>Runs a server function that sends one prompt directly to the OpenRouter API.</p>
                </hgroup>
                <button class="flat flex items-center justify-center gap-2" type="button" disabled={openRouterLoading()} onClick={onRunOpenRouterProof}>
                    <i aria-hidden="true">smart_toy</i>
                    <span>{openRouterLoading() ? "Running proof" : "Run OpenRouter proof"}</span>
                </button>
            </header>

            <Show when={openRouterError()}>
                {(message) => <article class="outlined error p-4" role="alert">
                    <h3>OpenRouter proof failed</h3>
                    <p>{message()}</p>
                </article>}
            </Show>

            <Show when={openRouterProof()}>
                {(proof) => <article class="tonal primary p-4 flex flex-col gap-2">
                    <h3>OpenRouter responded</h3>
                    <p>{proof().text}</p>
                    <small>Model: {proof().model}</small>
                </article>}
            </Show>
        </section>

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

