import {Match, Show, Switch, createSignal} from "solid-js";
import {A, useLocation} from "@web/router";
import {FlightDetails} from "~/FlightDetails/FlightDetails";
import {FlightSearch} from "~/FlightSearch/FlightSearch";
import {runPiOpenRouterProof, type PiProofResult} from "~/PiProof.server";

export default function App() {
    const location = useLocation();
    const [piLoading, setPiLoading] = createSignal(false);
    const [piError, setPiError] = createSignal<string>();
    const [piProof, setPiProof] = createSignal<PiProofResult>();

    async function onRunPiProof() {
        setPiLoading(true);
        setPiError(undefined);

        try {
            setPiProof(await runPiOpenRouterProof());
        } catch (caught) {
            setPiProof(undefined);
            setPiError(caught instanceof Error ? caught.message : "Unable to run the Pi SDK proof right now.");
        } finally {
            setPiLoading(false);
        }
    }

    return <main class="materialInspiredTheme dark min-h-screen p-6 flex flex-col gap-6">
        <section class="max-w-7xl w-full mx-auto elevated p-5 flex flex-col gap-3">
            <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <hgroup>
                    <h2>Pi SDK OpenRouter proof</h2>
                    <p>Runs a server function that creates a Pi coding agent SDK session and sends one prompt through OpenRouter.</p>
                </hgroup>
                <button class="flat flex items-center justify-center gap-2" type="button" disabled={piLoading()} onClick={onRunPiProof}>
                    <i aria-hidden="true">smart_toy</i>
                    <span>{piLoading() ? "Running proof" : "Run Pi proof"}</span>
                </button>
            </header>

            <Show when={piError()}>
                {(message) => <article class="outlined error p-4" role="alert">
                    <h3>Pi proof failed</h3>
                    <p>{message()}</p>
                </article>}
            </Show>

            <Show when={piProof()}>
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

