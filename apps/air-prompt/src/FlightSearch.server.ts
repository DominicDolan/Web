"use server"

import {getEvent} from "@web/server-functions/server";

type CloudflareContext = {
    cloudflare?: {
        env?: Record<string, string | undefined>;
    };
};

export type FlightSearchRequest = {
    tripType: "round_trip" | "one_way";
    departureId: string;
    arrivalId: string;
    outboundDate: string;
    returnDate?: string;
    adults: number;
    children: number;
    infantsInSeat: number;
    infantsOnLap: number;
    travelClass: "1" | "2" | "3" | "4";
    stops: "0" | "1" | "2" | "3";
    bags: number;
    maxPrice?: number;
    currency: string;
    sortBy: "1" | "2" | "3" | "4" | "5" | "6";
};

export type FlightAirport = {
    name?: string;
    id?: string;
    time?: string;
};

export type FlightSegment = {
    departure_airport?: FlightAirport;
    arrival_airport?: FlightAirport;
    duration?: number;
    airplane?: string;
    airline?: string;
    airline_logo?: string;
    travel_class?: string;
    flight_number?: string;
    legroom?: string;
    extensions?: string[];
};

export type FlightLayover = {
    duration?: number;
    name?: string;
    id?: string;
};

export type FlightCarbonEmissions = {
    this_flight?: number;
    typical_for_this_route?: number;
    difference_percent?: number;
};

export type FlightOption = {
    flights: FlightSegment[];
    layovers: FlightLayover[];
    total_duration?: number;
    carbon_emissions?: FlightCarbonEmissions;
    price?: number;
    type?: string;
    airline_logo?: string;
    departure_token?: string;
    booking_token?: string;
};

export type PriceInsights = {
    lowest_price?: number;
    price_level?: string;
    typical_price_range?: number[];
};

export type FlightSearchResponse = {
    searchId?: string;
    status?: string;
    bestFlights: FlightOption[];
    otherFlights: FlightOption[];
    priceInsights?: PriceInsights;
};

type SerpApiFlightResponse = {
    search_metadata?: {
        id?: string;
        status?: string;
    };
    error?: string;
    best_flights?: FlightOption[];
    other_flights?: FlightOption[];
    price_insights?: PriceInsights;
};

const SERP_API_ENDPOINT = "https://serpapi.com/search";

export async function searchFlights(request: FlightSearchRequest): Promise<FlightSearchResponse> {
    const apiKey = getSerpApiKey();
    const normalizedRequest = normalizeSearchRequest(request);
    const url = new URL(SERP_API_ENDPOINT);

    url.search = new URLSearchParams({
        engine: "google_flights",
        api_key: apiKey,
        departure_id: normalizedRequest.departureId,
        arrival_id: normalizedRequest.arrivalId,
        outbound_date: normalizedRequest.outboundDate,
        type: normalizedRequest.tripType === "round_trip" ? "1" : "2",
        travel_class: normalizedRequest.travelClass,
        adults: String(normalizedRequest.adults),
        children: String(normalizedRequest.children),
        infants_in_seat: String(normalizedRequest.infantsInSeat),
        infants_on_lap: String(normalizedRequest.infantsOnLap),
        stops: normalizedRequest.stops,
        bags: String(normalizedRequest.bags),
        currency: normalizedRequest.currency,
        sort_by: normalizedRequest.sortBy,
        hl: "en",
        gl: "us",
        no_cache: "true",
        ...(normalizedRequest.tripType === "round_trip" ? {return_date: normalizedRequest.returnDate ?? ""} : {}),
        ...(typeof normalizedRequest.maxPrice === "number" ? {max_price: String(normalizedRequest.maxPrice)} : {}),
    }).toString();

    const response = await fetch(url, {
        headers: {
            accept: "application/json",
        },
    });

    const payload = await response.json() as SerpApiFlightResponse;

    if (!response.ok || payload.error) {
        throw new Error(payload.error ?? `SERP API request failed with status ${response.status}.`);
    }

    return {
        searchId: payload.search_metadata?.id,
        status: payload.search_metadata?.status,
        bestFlights: sanitizeFlights(payload.best_flights),
        otherFlights: sanitizeFlights(payload.other_flights),
        priceInsights: payload.price_insights,
    };
}

function normalizeSearchRequest(request: FlightSearchRequest): FlightSearchRequest {
    const departureId = normalizeAirportId(request.departureId);
    const arrivalId = normalizeAirportId(request.arrivalId);

    if (!departureId) throw new Error("Enter a departure airport or city code.");
    if (!arrivalId) throw new Error("Enter an arrival airport or city code.");
    if (departureId === arrivalId) throw new Error("Departure and arrival must be different.");
    if (!isDateString(request.outboundDate)) throw new Error("Choose a valid departure date.");
    if (request.tripType === "round_trip" && !isDateString(request.returnDate)) throw new Error("Choose a valid return date.");
    if (request.tripType === "round_trip" && request.returnDate && request.returnDate < request.outboundDate) {
        throw new Error("Return date must be after the departure date.");
    }

    return {
        ...request,
        departureId,
        arrivalId,
        adults: clampInteger(request.adults, 1, 9),
        children: clampInteger(request.children, 0, 9),
        infantsInSeat: clampInteger(request.infantsInSeat, 0, 9),
        infantsOnLap: clampInteger(request.infantsOnLap, 0, 9),
        bags: clampInteger(request.bags, 0, 9),
        maxPrice: typeof request.maxPrice === "number" && Number.isFinite(request.maxPrice) && request.maxPrice > 0
            ? Math.floor(request.maxPrice)
            : undefined,
        currency: request.currency.trim().toUpperCase() || "USD",
    };
}

function getSerpApiKey() {
    const event = getEvent<unknown, unknown, CloudflareContext>();
    const env = event.context?.cloudflare?.env;
    const viteEnv = (import.meta as ImportMeta & {
        env?: Record<string, string | undefined>;
    }).env;
    const processEnv = (globalThis as typeof globalThis & {
        process?: {env?: Record<string, string | undefined>};
    }).process?.env;
    const apiKey = env?.["SERF_API_KEY"]
        ?? env?.["SERP_API_KEY"]
        ?? viteEnv?.["SERF_API_KEY"]
        ?? viteEnv?.["SERP_API_KEY"]
        ?? processEnv?.["SERF_API_KEY"]
        ?? processEnv?.["SERP_API_KEY"];

    if (!apiKey) {
        throw new Error("SERP API key is not configured on the server.");
    }

    return apiKey;
}

function normalizeAirportId(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, "");
}

function isDateString(value: string | undefined): value is string {
    return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function clampInteger(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(Math.floor(value), min), max);
}

function sanitizeFlights(flights: FlightOption[] | undefined) {
    return (flights ?? []).map((flight) => ({
        ...flight,
        flights: flight.flights ?? [],
        layovers: flight.layovers ?? [],
        price: typeof flight.price === "number" ? flight.price : undefined,
        total_duration: typeof flight.total_duration === "number" ? flight.total_duration : undefined,
    })).filter((flight) => flight.flights.length > 0);
}



