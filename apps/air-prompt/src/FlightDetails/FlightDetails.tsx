import {createMemo, createSignal, onSettled, Show} from "solid-js";
import {A} from "@web/router";
import {getFlightDetailsPlaceholder} from "./FlightDetails.server";

export function FlightDetails(props: {flightId?: string}) {
    const decodedFlightId = createMemo(() => props.flightId ? decodeURIComponent(props.flightId) : "unknown-flight");
    const [details, setDetails] = createSignal<Awaited<ReturnType<typeof getFlightDetailsPlaceholder>>>();
    const [error, setError] = createSignal<string>();

    onSettled(() => {
        void loadDetails();
    });

    async function loadDetails() {
        try {
            setError(undefined);
            setDetails(await getFlightDetailsPlaceholder(decodedFlightId()));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to load flight details.");
        }
    }

    return <>
        <header class="max-w-7xl w-full mx-auto flex flex-col gap-3">
            <nav aria-label="Breadcrumb">
                <ol class="flex gap-2">
                    <li><A href="/" matches={() => false}>Search flights</A></li>
                    <li><a aria-current="page">Flight details</a></li>
                </ol>
            </nav>
            <hgroup class="flex flex-col gap-2">
                <h1 class="display large">Flight details</h1>
                <p class="display small variant">Placeholder route for flight result {decodedFlightId()}.</p>
            </hgroup>
        </header>

        <section class="max-w-7xl w-full mx-auto grid gap-6 lg:grid-cols-[1fr_20rem]">
            <article class="elevated p-6 flex flex-col gap-4">
                <Show when={error()} fallback={<>
                    <hgroup>
                        <h2>{details()?.title ?? "Preparing flight details"}</h2>
                        <p>{details()?.message ?? "This route is wired and ready for the next detail-data integration."}</p>
                    </hgroup>
                    <section class="grid gap-4 md:grid-cols-2">
                        <article class="outlined p-4">
                            <h3>Flight token</h3>
                            <p>{details()?.id ?? decodedFlightId()}</p>
                        </article>
                        <article class="outlined p-4">
                            <h3>Planned details</h3>
                            <ul class="plain flex flex-col gap-2">
                                <li>Full itinerary and layovers</li>
                                <li>Fare and booking links</li>
                                <li>Baggage and cabin notes</li>
                                <li>Price and emissions context</li>
                            </ul>
                        </article>
                    </section>
                </>}>
                    {(message) => <article class="outlined error p-4" role="alert">
                        <h2>Details unavailable</h2>
                        <p>{message()}</p>
                    </article>}
                </Show>
            </article>

            <aside>
                <article class="tonal primary p-5 flex flex-col gap-3">
                    <h2>Next step</h2>
                    <p>When a dedicated details API is added, this page can hydrate from the route token without changing search results.</p>
                    <footer>
                        <A href="/" class="flat flex items-center justify-center gap-2" matches={() => false}>
                            <i aria-hidden="true">arrow_back</i>
                            <span>Back to search</span>
                        </A>
                    </footer>
                </article>
            </aside>
        </section>
    </>;
}

