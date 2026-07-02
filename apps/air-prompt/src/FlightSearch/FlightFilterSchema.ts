import type {FlightSearchRequest} from "./FlightSearchTypes";
import {addDays, formatDateInput} from "./FlightSearchUtils";

export type FlightFilterValue = string | number | undefined;

export type FlightFilterValues = Record<string, FlightFilterValue>;

export type FlightFilterCondition = {
    field: keyof FlightSearchRequest | string;
    equals?: FlightFilterValue;
    notEquals?: FlightFilterValue;
};

export type FlightFilterOption = {
    label: string;
    value: string;
};

export type FlightFilterBase = {
    key: keyof FlightSearchRequest;
    label: string;
    helperText?: string;
    defaultValue?: FlightFilterValue;
    required?: boolean;
    hiddenWhen?: FlightFilterCondition;
    disabledWhen?: FlightFilterCondition;
};

export type FlightRadioFilter = FlightFilterBase & {
    kind: "radio";
    options: FlightFilterOption[];
};

export type FlightTextFilter = FlightFilterBase & {
    kind: "text";
    icon?: string;
    placeholder?: string;
};

export type FlightDateFilter = FlightFilterBase & {
    kind: "date";
    min?: string;
    minFromField?: keyof FlightSearchRequest;
};

export type FlightNumberFilter = FlightFilterBase & {
    kind: "number";
    icon?: string;
    min?: number;
    max?: number;
    placeholder?: string;
    optional?: boolean;
};

export type FlightSelectFilter = FlightFilterBase & {
    kind: "select";
    options: FlightFilterOption[];
};

export type FlightFilter = FlightRadioFilter | FlightTextFilter | FlightDateFilter | FlightNumberFilter | FlightSelectFilter;

export type FlightFilterSection = {
    title?: string;
    layout?: "stack" | "two-column";
    filters: FlightFilter[];
};

export type FlightStaticFilter = {
    key: keyof FlightSearchRequest;
    value: FlightFilterValue;
    label: string;
    message: string;
    icon?: string;
};

export type FlightFilterSchema = {
    title: string;
    description?: string;
    staticFilters?: FlightStaticFilter[];
    sections: FlightFilterSection[];
};

export function createDefaultFlightFilterSchema(baseDate = new Date()): FlightFilterSchema {
    const outboundDate = addDays(baseDate, 14);
    const returnDate = addDays(baseDate, 21);
    const outboundDateInput = formatDateInput(outboundDate);
    const returnDateInput = formatDateInput(returnDate);

    return {
        title: "Trip details",
        description: "Default declarative filter schema rendered before any generated prompt schema is available.",
        sections: [
            {
                filters: [
                    {
                        kind: "radio",
                        key: "tripType",
                        label: "Trip type",
                        defaultValue: "round_trip",
                        options: [
                            {label: "Round trip", value: "round_trip"},
                            {label: "One way", value: "one_way"},
                        ],
                    },
                ],
            },
            {
                layout: "stack",
                filters: [
                    {
                        kind: "text",
                        key: "departureId",
                        label: "From",
                        icon: "flight_takeoff",
                        placeholder: "JFK",
                        defaultValue: "JFK",
                        required: true,
                    },
                    {
                        kind: "text",
                        key: "arrivalId",
                        label: "To",
                        icon: "flight_land",
                        placeholder: "LHR",
                        defaultValue: "LHR",
                        required: true,
                    },
                ],
            },
            {
                layout: "two-column",
                filters: [
                    {
                        kind: "date",
                        key: "outboundDate",
                        label: "Depart",
                        defaultValue: outboundDateInput,
                        min: formatDateInput(baseDate),
                        required: true,
                    },
                    {
                        kind: "date",
                        key: "returnDate",
                        label: "Return",
                        defaultValue: returnDateInput,
                        minFromField: "outboundDate",
                        required: true,
                        disabledWhen: {field: "tripType", equals: "one_way"},
                    },
                ],
            },
            {
                layout: "two-column",
                filters: [
                    {kind: "number", key: "adults", label: "Adults", defaultValue: 1, min: 1, max: 9},
                    {kind: "number", key: "children", label: "Children", defaultValue: 0, min: 0, max: 9},
                    {kind: "number", key: "infantsInSeat", label: "Infants in seat", defaultValue: 0, min: 0, max: 9},
                    {kind: "number", key: "infantsOnLap", label: "Infants on lap", defaultValue: 0, min: 0, max: 9},
                ],
            },
            {
                layout: "stack",
                filters: [
                    {
                        kind: "select",
                        key: "travelClass",
                        label: "Cabin",
                        defaultValue: "1",
                        options: [
                            {label: "Economy", value: "1"},
                            {label: "Premium economy", value: "2"},
                            {label: "Business", value: "3"},
                            {label: "First", value: "4"},
                        ],
                    },
                    {
                        kind: "select",
                        key: "stops",
                        label: "Stops",
                        defaultValue: "0",
                        options: [
                            {label: "Any number of stops", value: "0"},
                            {label: "Nonstop only", value: "1"},
                            {label: "1 stop or fewer", value: "2"},
                            {label: "2 stops or fewer", value: "3"},
                        ],
                    },
                    {kind: "number", key: "bags", label: "Carry-on bags", defaultValue: 0, min: 0, max: 9},
                    {kind: "number", key: "maxPrice", label: "Maximum price", icon: "payments", min: 0, placeholder: "Optional", optional: true},
                ],
            },
            {
                layout: "two-column",
                filters: [
                    {
                        kind: "select",
                        key: "currency",
                        label: "Currency",
                        defaultValue: "USD",
                        options: [
                            {label: "USD", value: "USD"},
                            {label: "EUR", value: "EUR"},
                            {label: "GBP", value: "GBP"},
                            {label: "CAD", value: "CAD"},
                            {label: "AUD", value: "AUD"},
                        ],
                    },
                    {
                        kind: "select",
                        key: "sortBy",
                        label: "Sort",
                        defaultValue: "1",
                        options: [
                            {label: "Best flights", value: "1"},
                            {label: "Price", value: "2"},
                            {label: "Departure time", value: "3"},
                            {label: "Arrival time", value: "4"},
                            {label: "Duration", value: "5"},
                            {label: "Emissions", value: "6"},
                        ],
                    },
                ],
            },
        ],
    };
}

export function createDefaultFlightFilterValues(schema: FlightFilterSchema): FlightFilterValues {
    return {
        ...Object.fromEntries(
            schema.sections.flatMap((section) => section.filters.map((filter) => [filter.key, filter.defaultValue])),
        ),
        ...Object.fromEntries((schema.staticFilters ?? []).map((filter) => [filter.key, filter.value])),
    };
}


