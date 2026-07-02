import {createMemo, createSignal, For, Show} from "solid-js";
import {FlightOption, FlightSearchRequest, searchFlights} from "~/FlightSearch.server";

type TripType = FlightSearchRequest["tripType"];

const today = new Date();
const twoWeeksFromToday = addDays(today, 14);
const threeWeeksFromToday = addDays(today, 21);

function formatDateInput(date: Date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function formatDuration(minutes?: number) {
    if (!minutes) return "Duration unavailable";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

function formatPrice(price?: number, currency = "USD") {
    if (typeof price !== "number") return "Price unavailable";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(price);
}

function formatAirport(segment: FlightOption["flights"][number] | undefined, side: "departure" | "arrival") {
    const airport = side === "departure" ? segment?.departure_airport : segment?.arrival_airport;
    if (!airport) return "Airport unavailable";
    return `${airport.id ?? ""}${airport.name ? ` · ${airport.name}` : ""}`.trim();
}

function formatTime(segment: FlightOption["flights"][number] | undefined, side: "departure" | "arrival") {
    const airport = side === "departure" ? segment?.departure_airport : segment?.arrival_airport;
    return airport?.time ?? "Time unavailable";
}

function FlightCard(props: {flight: FlightOption; currency: string; index: number}) {
    const firstSegment = () => props.flight.flights[0];
    const lastSegment = () => props.flight.flights.at(-1);
    const stops = () => Math.max(props.flight.flights.length - 1, 0);

    return <li>
        <article class="outlined flex flex-col gap-4 p-5" aria-label="Flight option">
            <header class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <hgroup class="flex flex-col gap-1">
                    <h3>{props.flight.flights.map((flight) => flight.airline).filter(Boolean).join(" + ") || "Flight option"}</h3>
                    <p>{stops() === 0 ? "Nonstop" : `${stops()} stop${stops() === 1 ? "" : "s"}`} · {formatDuration(props.flight.total_duration)}</p>
                </hgroup>
                <aside class="flex flex-col gap-1 md:items-end" aria-label="Fare summary">
                    <strong class="headline small">{formatPrice(props.flight.price, props.currency)}</strong>
                    <small>{props.flight.type ?? `Result ${props.index + 1}`}</small>
                </aside>
            </header>

            <section class="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <hgroup class="flex flex-col gap-1">
                    <p class="label medium variant">Depart</p>
                    <p class="title medium">{formatTime(firstSegment(), "departure")}</p>
                    <p>{formatAirport(firstSegment(), "departure")}</p>
                </hgroup>
                <i aria-hidden="true">flight</i>
                <hgroup class="flex flex-col gap-1">
                    <p class="label medium variant">Arrive</p>
                    <p class="title medium">{formatTime(lastSegment(), "arrival")}</p>
                    <p>{formatAirport(lastSegment(), "arrival")}</p>
                </hgroup>
            </section>

            <Show when={props.flight.layovers.length > 0 || props.flight.carbon_emissions}>
                <footer class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <Show when={props.flight.layovers.length > 0}>
                        <ul class="chips flex flex-wrap gap-2" aria-label="Layovers">
                            <For each={props.flight.layovers}>{(layover) =>
                                <li>{layover.id ?? layover.name}{layover.duration ? ` · ${formatDuration(layover.duration)}` : ""}</li>
                            }</For>
                        </ul>
                    </Show>
                    <Show when={props.flight.carbon_emissions}>
                        <small>{props.flight.carbon_emissions?.difference_percent}% emissions compared with typical</small>
                    </Show>
                </footer>
            </Show>
        </article>
    </li>;
}

export default function App() {
    const [tripType, setTripType] = createSignal<TripType>("round_trip");
    const [origin, setOrigin] = createSignal("JFK");
    const [destination, setDestination] = createSignal("LHR");
    const [outboundDate, setOutboundDate] = createSignal(formatDateInput(twoWeeksFromToday));
    const [returnDate, setReturnDate] = createSignal(formatDateInput(threeWeeksFromToday));
    const [adults, setAdults] = createSignal(1);
    const [children, setChildren] = createSignal(0);
    const [infantsInSeat, setInfantsInSeat] = createSignal(0);
    const [infantsOnLap, setInfantsOnLap] = createSignal(0);
    const [travelClass, setTravelClass] = createSignal<FlightSearchRequest["travelClass"]>("1");
    const [stops, setStops] = createSignal<FlightSearchRequest["stops"]>("0");
    const [bags, setBags] = createSignal(0);
    const [maxPrice, setMaxPrice] = createSignal("");
    const [currency, setCurrency] = createSignal("USD");
    const [sortBy, setSortBy] = createSignal<FlightSearchRequest["sortBy"]>("1");
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal<string>();
    const [hasSearched, setHasSearched] = createSignal(false);
    const [results, setResults] = createSignal<Awaited<ReturnType<typeof searchFlights>>>();

    const allFlights = createMemo(() => [
        ...(results()?.bestFlights ?? []),
        ...(results()?.otherFlights ?? []),
    ]);

    const priceInsight = createMemo(() => results()?.priceInsights);

    async function onSubmit(event: SubmitEvent) {
        event.preventDefault();
        setLoading(true);
        setError(undefined);
        setHasSearched(true);

        try {
            const response = await searchFlights({
                tripType: tripType(),
                departureId: origin(),
                arrivalId: destination(),
                outboundDate: outboundDate(),
                returnDate: tripType() === "round_trip" ? returnDate() : undefined,
                adults: adults(),
                children: children(),
                infantsInSeat: infantsInSeat(),
                infantsOnLap: infantsOnLap(),
                travelClass: travelClass(),
                stops: stops(),
                bags: bags(),
                maxPrice: maxPrice() ? Number(maxPrice()) : undefined,
                currency: currency(),
                sortBy: sortBy(),
            });

            setResults(response);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to search flights right now.");
            setResults(undefined);
        } finally {
            setLoading(false);
        }
    }

    return <main class="materialInspiredTheme dark min-h-screen p-6 flex flex-col gap-6">
        <header class="max-w-7xl w-full mx-auto flex flex-col gap-3">
            <nav aria-label="Breadcrumb">
                <ol class="flex gap-2">
                    <li><a href="/" aria-current="page">Air Prompt</a></li>
                </ol>
            </nav>
            <hgroup class="flex flex-col gap-2">
                <h1 class="display large">Search flights</h1>
                <p class="display small variant">Compare Google Flights results with booking-site filters while keeping the API key on the server.</p>
            </hgroup>
        </header>

        <section class="max-w-7xl w-full mx-auto grid gap-6 xl:grid-cols-[24rem_1fr]">
            <article class="elevated p-5">
                <form class="flex flex-col gap-5" onSubmit={onSubmit}>
                    <header class="flex flex-col gap-3">
                        <h2>Trip details</h2>
                        <div role="radiogroup" aria-label="Trip type" class="flex">
                            <button type="button" aria-checked={tripType() === "round_trip" ? "true" : "false"} onClick={() => setTripType("round_trip")}>Round trip</button>
                            <button type="button" aria-checked={tripType() === "one_way" ? "true" : "false"} onClick={() => setTripType("one_way")}>One way</button>
                        </div>
                    </header>

                    <section class="grid gap-4">
                        <form-field class="flex flex-col gap-2">
                            <label for="origin">From</label>
                            <input-shell class="outlined flex items-center gap-2">
                                <i aria-hidden="true">flight_takeoff</i>
                                <input id="origin" name="origin" value={origin()} onInput={(event) => setOrigin(event.currentTarget.value)} placeholder="JFK" required />
                            </input-shell>
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="destination">To</label>
                            <input-shell class="outlined flex items-center gap-2">
                                <i aria-hidden="true">flight_land</i>
                                <input id="destination" name="destination" value={destination()} onInput={(event) => setDestination(event.currentTarget.value)} placeholder="LHR" required />
                            </input-shell>
                        </form-field>
                    </section>

                    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                        <form-field class="flex flex-col gap-2">
                            <label for="outbound-date">Depart</label>
                            <input id="outbound-date" type="date" value={outboundDate()} min={formatDateInput(today)} onInput={(event) => setOutboundDate(event.currentTarget.value)} required />
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="return-date">Return</label>
                            <input id="return-date" type="date" value={returnDate()} min={outboundDate()} onInput={(event) => setReturnDate(event.currentTarget.value)} disabled={tripType() === "one_way"} required={tripType() === "round_trip"} />
                        </form-field>
                    </section>

                    <section class="grid gap-4 md:grid-cols-2">
                        <form-field class="flex flex-col gap-2">
                            <label for="adults">Adults</label>
                            <input id="adults" type="number" min="1" max="9" value={adults()} onInput={(event) => setAdults(Number(event.currentTarget.value))} />
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="children">Children</label>
                            <input id="children" type="number" min="0" max="9" value={children()} onInput={(event) => setChildren(Number(event.currentTarget.value))} />
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="infants-seat">Infants in seat</label>
                            <input id="infants-seat" type="number" min="0" max="9" value={infantsInSeat()} onInput={(event) => setInfantsInSeat(Number(event.currentTarget.value))} />
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="infants-lap">Infants on lap</label>
                            <input id="infants-lap" type="number" min="0" max="9" value={infantsOnLap()} onInput={(event) => setInfantsOnLap(Number(event.currentTarget.value))} />
                        </form-field>
                    </section>

                    <section class="grid gap-4">
                        <form-field class="flex flex-col gap-2">
                            <label for="travel-class">Cabin</label>
                            <select id="travel-class" value={travelClass()} onInput={(event) => setTravelClass(event.currentTarget.value as FlightSearchRequest["travelClass"])}>
                                <option value="1">Economy</option>
                                <option value="2">Premium economy</option>
                                <option value="3">Business</option>
                                <option value="4">First</option>
                            </select>
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="stops">Stops</label>
                            <select id="stops" value={stops()} onInput={(event) => setStops(event.currentTarget.value as FlightSearchRequest["stops"])}>
                                <option value="0">Any number of stops</option>
                                <option value="1">Nonstop only</option>
                                <option value="2">1 stop or fewer</option>
                                <option value="3">2 stops or fewer</option>
                            </select>
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="bags">Carry-on bags</label>
                            <input id="bags" type="number" min="0" max="9" value={bags()} onInput={(event) => setBags(Number(event.currentTarget.value))} />
                        </form-field>

                        <form-field class="flex flex-col gap-2">
                            <label for="max-price">Maximum price</label>
                            <input-shell class="outlined flex items-center gap-2">
                                <i aria-hidden="true">payments</i>
                                <input id="max-price" type="number" min="0" value={maxPrice()} onInput={(event) => setMaxPrice(event.currentTarget.value)} placeholder="Optional" />
                            </input-shell>
                        </form-field>

                        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                            <form-field class="flex flex-col gap-2">
                                <label for="currency">Currency</label>
                                <select id="currency" value={currency()} onInput={(event) => setCurrency(event.currentTarget.value)}>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="CAD">CAD</option>
                                    <option value="AUD">AUD</option>
                                </select>
                            </form-field>

                            <form-field class="flex flex-col gap-2">
                                <label for="sort-by">Sort</label>
                                <select id="sort-by" value={sortBy()} onInput={(event) => setSortBy(event.currentTarget.value as FlightSearchRequest["sortBy"])}>
                                    <option value="1">Best flights</option>
                                    <option value="2">Price</option>
                                    <option value="3">Departure time</option>
                                    <option value="4">Arrival time</option>
                                    <option value="5">Duration</option>
                                    <option value="6">Emissions</option>
                                </select>
                            </form-field>
                        </div>
                    </section>

                    <footer class="flex flex-col gap-3">
                        <button class="flat flex items-center justify-center gap-2" type="submit" disabled={loading()}>
                            <i aria-hidden="true">search</i>
                            <span>{loading() ? "Searching" : "Search flights"}</span>
                        </button>
                        <small>Use IATA airport codes or city airport IDs supported by Google Flights.</small>
                    </footer>
                </form>
            </article>

            <section aria-labelledby="results-heading" class="flex flex-col gap-4">
                <header class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <hgroup>
                        <h2 id="results-heading">Results</h2>
                        <p>{hasSearched() ? `${allFlights().length} flight option${allFlights().length === 1 ? "" : "s"} found` : "Start with a route, dates, and passenger mix."}</p>
                    </hgroup>
                    <Show when={priceInsight()}>
                        {(insight) => <article class="tonal primary p-4">
                            <h3>Price insight</h3>
                            <p>{insight().price_level ?? "Insight available"}{typeof insight().lowest_price === "number" ? ` · Lowest seen ${formatPrice(insight().lowest_price, currency())}` : ""}</p>
                        </article>}
                    </Show>
                </header>

                <Show when={error()}>
                    {(message) => <article class="outlined error p-4" role="alert">
                        <h3>Search unavailable</h3>
                        <p>{message()}</p>
                    </article>}
                </Show>

                <Show when={loading()}>
                    <empty-state class="skeleton flex flex-col gap-3 p-6" aria-busy="true">
                        <div class="h-4 w-3/4"></div>
                        <div class="h-4 w-1/2"></div>
                        <div class="h-4 w-2/3"></div>
                    </empty-state>
                </Show>

                <Show when={!loading() && hasSearched() && allFlights().length === 0 && !error()}>
                    <empty-state class="empty flex flex-col items-center gap-3 p-8">
                        <h3>No flights found</h3>
                        <p>Try nearby airports, broader stop filters, or a higher maximum price.</p>
                    </empty-state>
                </Show>

                <Show when={!loading() && allFlights().length > 0}>
                    <ol class="plain flex flex-col gap-4">
                        <For each={allFlights()}>{(flight, index) =>
                            <FlightCard flight={flight} currency={currency()} index={index()} />
                        }</For>
                    </ol>
                </Show>
            </section>
        </section>
    </main>;
}
