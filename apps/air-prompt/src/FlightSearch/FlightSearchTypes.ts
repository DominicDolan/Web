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

