import {For, Show} from "solid-js";
import {A} from "@web/router";
import type {FlightOption} from "./FlightSearchTypes";
import {createFlightRouteId, formatAirport, formatDuration, formatPrice, formatTime} from "./FlightSearchUtils";

export function FlightCard(props: {flight: FlightOption; currency: string; index: number}) {
    const firstSegment = () => props.flight.flights[0];
    const lastSegment = () => props.flight.flights.at(-1);
    const stops = () => Math.max(props.flight.flights.length - 1, 0);
    const routeId = () => createFlightRouteId(props.flight, props.index);

    return <li>
        <A href={`/flights/${routeId()}`} class="contents" aria-label={`Open flight option ${props.index + 1}`}>
            <article class="outlined flex flex-col gap-4 p-5" aria-label="Flight option" role="button">
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
        </A>
    </li>;
}

