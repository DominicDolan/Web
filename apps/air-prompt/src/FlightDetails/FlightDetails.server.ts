"use server"

export type FlightDetailsPlaceholder = {
    id: string;
    title: string;
    message: string;
};

export async function getFlightDetailsPlaceholder(id: string): Promise<FlightDetailsPlaceholder> {
    return {
        id,
        title: "Flight details coming soon",
        message: "This placeholder is ready for a future details lookup, booking deep link, fare rules, baggage policy, and seat/cabin information.",
    };
}

