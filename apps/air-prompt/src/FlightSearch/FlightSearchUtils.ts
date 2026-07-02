import type {FlightOption} from "./FlightSearchTypes";

export function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

export function formatDateInput(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function formatDuration(minutes?: number) {
    if (!minutes) return "Duration unavailable";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
}

export function formatPrice(price?: number, currency = "USD") {
    if (typeof price !== "number") return "Price unavailable";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(price);
}

export function formatAirport(segment: FlightOption["flights"][number] | undefined, side: "departure" | "arrival") {
    const airport = side === "departure" ? segment?.departure_airport : segment?.arrival_airport;
    if (!airport) return "Airport unavailable";
    return `${airport.id ?? ""}${airport.name ? ` · ${airport.name}` : ""}`.trim();
}

export function formatTime(segment: FlightOption["flights"][number] | undefined, side: "departure" | "arrival") {
    const airport = side === "departure" ? segment?.departure_airport : segment?.arrival_airport;
    return airport?.time ?? "Time unavailable";
}

export function createFlightRouteId(flight: FlightOption, index: number) {
    return encodeURIComponent(flight.departure_token ?? flight.booking_token ?? `result-${index + 1}`);
}

