import {createMemo, createSignal, For, Match, Show, Switch} from "solid-js";
import type {Element} from "solid-js";
import {A} from "@web/router";
import {
    createDefaultFlightFilterSchema,
    createDefaultFlightFilterValues,
    type FlightFilter,
    type FlightFilterCondition,
    type FlightFilterSchema,
    type FlightFilterValue,
    type FlightFilterValues,
} from "./FlightFilterSchema";
import {FlightCard} from "./FlightCard";
import {searchFlights} from "./FlightSearch.server";
import {generateFlightFilterSchemaFromPrompt} from "./FlightSchemaGenerator.server";
import type {FlightSearchRequest} from "./FlightSearchTypes";
import {formatPrice} from "./FlightSearchUtils";
import styles from "./FlightSearch.module.css";

const today = new Date();
const defaultFilterSchema = createDefaultFlightFilterSchema(today);
const suggestedPrompts = [
    "I want to find the cheapest flight anywhere this month",
    "Find nonstop weekend flights from JFK to Europe",
    "Show business class flights to Tokyo in August",
    "Find family flights with low baggage costs",
];

export function FlightSearch() {
    const [filterSchema, setFilterSchema] = createSignal<FlightFilterSchema>(defaultFilterSchema);
    const [filters, setFilters] = createSignal<FlightFilterValues>(createDefaultFlightFilterValues(defaultFilterSchema));
    const [prompt, setPrompt] = createSignal("");
    const [generatingFilters, setGeneratingFilters] = createSignal(false);
    const [promptError, setPromptError] = createSignal<string>();
    const [generatedSummary, setGeneratedSummary] = createSignal<string>();
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal<string>();
    const [hasSearched, setHasSearched] = createSignal(false);
    const [results, setResults] = createSignal<Awaited<ReturnType<typeof searchFlights>>>();

    const allFlights = createMemo(() => [
        ...(results()?.bestFlights ?? []),
        ...(results()?.otherFlights ?? []),
    ]);

    const priceInsight = createMemo(() => results()?.priceInsights);
    const currentCurrency = createMemo(() => String(filters().currency ?? "USD"));
    const staticFilterKeys = createMemo(() => new Set((filterSchema().staticFilters ?? []).map((filter) => filter.key)));

    function setFilterValue(key: string, value: FlightFilterValue) {
        setFilters((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function onGenerateFilters() {
        setGeneratingFilters(true);
        setPromptError(undefined);
        setGeneratedSummary(undefined);

        try {
            const result = await generateFlightFilterSchemaFromPrompt(prompt());

            if (!result.ok) {
                setPromptError(result.userErrorMessage);
                return;
            }

            setFilterSchema(result.schema);
            setFilters(createDefaultFlightFilterValues(result.schema));
            setGeneratedSummary(result.summary);
            setResults(undefined);
            setHasSearched(false);
            setError(undefined);
        } catch (caught) {
            setPromptError(caught instanceof Error ? caught.message : "Unable to generate filters right now.");
        } finally {
            setGeneratingFilters(false);
        }
    }

    function onResetGeneratedFilters() {
        setFilterSchema(defaultFilterSchema);
        setFilters(createDefaultFlightFilterValues(defaultFilterSchema));
        setGeneratedSummary(undefined);
        setPromptError(undefined);
        setResults(undefined);
        setHasSearched(false);
    }

    async function onSubmit(event: SubmitEvent) {
        event.preventDefault();
        setLoading(true);
        setError(undefined);
        setHasSearched(true);

        try {
            const response = await searchFlights(createSearchRequest(filters()));

            setResults(response);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Unable to search flights right now.");
            setResults(undefined);
        } finally {
            setLoading(false);
        }
    }

    return <>
        <header class="max-w-7xl w-full mx-auto flex flex-col gap-3">
            <nav aria-label="Breadcrumb">
                <ol class="flex gap-2">
                    <li><A href="/" matches={() => true} aria-current="page">Air Prompt</A></li>
                </ol>
            </nav>
        </header>

        <article class={`${styles.promptComposer} max-w-7xl w-full mx-auto elevated p-5 flex flex-col gap-4`}>
            <header class={`${styles.promptComposerHeader} flex flex-col gap-2`}>
                <p class={styles.promptEyebrow}>Generative filter builder</p>
            </header>

            <section class={`${styles.suggestions} flex flex-col gap-2`} aria-label="Suggested prompts">
                <div class="flex flex-wrap gap-2">
                    <For each={suggestedPrompts}>{(suggestion) =>
                        <button class={`${styles.suggestionChip} outlined`} type="button" onClick={() => setPrompt(suggestion)}>{suggestion}</button>
                    }</For>
                </div>
            </section>

            <form-field class={`${styles.promptField} flex flex-col gap-2`}>
                <div class={styles.promptInputRow}>
                    <textarea
                        id="filter-prompt"
                        rows="2"
                        value={prompt()}
                        onInput={(event) => setPrompt(event.currentTarget.value)}
                        placeholder="Example: I want to find the cheapest flight anywhere this month"
                    />
                    <button class={`${styles.generateButton} flat`} type="button" disabled={generatingFilters()} onClick={onGenerateFilters} aria-label="Generate filter schema">
                        <i aria-hidden="true">auto_awesome</i>
                        <span>{generatingFilters() ? "Generating" : "Generate"}</span>
                    </button>
                </div>
            </form-field>

            <Show when={promptError()}>
                {(message) => <article class="outlined error p-4" role="alert">
                    <h3>Could not generate filters</h3>
                    <p>{message()}</p>
                </article>}
            </Show>

            <Show when={generatedSummary()}>
                {(summary) => <article class="tonal primary p-4">
                    <h3>Generated schema applied</h3>
                    <p>{summary()}</p>
                </article>}
            </Show>
        </article>

        <section class="max-w-7xl w-full mx-auto grid gap-6 xl:grid-cols-[24rem_1fr]">
            <article class="elevated p-5">
                <form class="flex flex-col gap-5" onSubmit={onSubmit}>
                    <header class="flex flex-col gap-3">
                        <h2>{filterSchema().title}</h2>
                        <Show when={filterSchema().description}>
                            {(description) => <p>{description()}</p>}
                        </Show>
                    </header>

                    <Show when={(filterSchema().staticFilters ?? []).length > 0}>
                        <aside class="tonal primary p-4 flex flex-col gap-2" aria-label="Static search filters">
                            <For each={filterSchema().staticFilters}>{(staticFilter) =>
                                <p class="flex items-center gap-2">
                                    <Show when={staticFilter.icon}>
                                        {(icon) => <i aria-hidden="true">{icon()}</i>}
                                    </Show>
                                    <span><strong>{staticFilter.label}:</strong> {staticFilter.message}</span>
                                </p>
                            }</For>
                        </aside>
                    </Show>

                    <For each={filterSchema().sections}>{(section) =>
                        <section class={section.layout === "two-column" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-1" : "grid gap-4"}>
                            <Show when={section.title}>
                                {(title) => <h3>{title()}</h3>}
                            </Show>
                            <For each={section.filters.filter((field) => !staticFilterKeys().has(field.key) && !conditionMatches(field.hiddenWhen, filters()))}>{(field) =>
                                <FlightFilterControl field={field} values={filters()} onChange={setFilterValue} />
                            }</For>
                        </section>
                    }</For>

                    <footer class="flex flex-col gap-3">
                        <button class="flat flex items-center justify-center gap-2" type="submit" disabled={loading()}>
                            <i aria-hidden="true">search</i>
                            <span>{loading() ? "Searching" : "Search flights"}</span>
                        </button>
                        <Show when={generatedSummary()}>
                            <button class="outlined" type="button" disabled={generatingFilters() || loading()} onClick={onResetGeneratedFilters}>Reset default filters</button>
                        </Show>
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
                            <p>{insight().price_level ?? "Insight available"}{typeof insight().lowest_price === "number" ? ` · Lowest seen ${formatPrice(insight().lowest_price, currentCurrency())}` : ""}</p>
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
                            <FlightCard flight={flight} currency={currentCurrency()} index={index()} />
                        }</For>
                    </ol>
                </Show>
            </section>
        </section>
    </>;
}

type FlightFilterControlProps = {
    field: FlightFilter;
    values: FlightFilterValues;
    onChange: (key: string, value: FlightFilterValue) => void;
};

function FlightFilterControl(props: FlightFilterControlProps) {
    const id = createMemo(() => `filter-${String(props.field.key)}`);
    const value = createMemo(() => props.values[props.field.key]);
    const disabled = createMemo(() => conditionMatches(props.field.disabledWhen, props.values));

    return <Switch>
        <Match when={props.field.kind === "radio" && props.field}>
            {(field) => <form-field class="flex flex-col gap-2">
                <label>{field().label}</label>
                <div role="radiogroup" aria-label={field().label} class="flex">
                    <For each={field().options}>{(option) =>
                        <button
                            type="button"
                            aria-checked={value() === option.value ? "true" : "false"}
                            disabled={disabled()}
                            onClick={() => props.onChange(field().key, option.value)}
                        >{option.label}</button>
                    }</For>
                </div>
                <FilterHelperText text={field().helperText} />
            </form-field>}
        </Match>

        <Match when={props.field.kind === "text" && props.field}>
            {(field) => <form-field class="flex flex-col gap-2">
                <label for={id()}>{field().label}</label>
                <InputShell icon={field().icon}>
                    <input
                        id={id()}
                        name={String(field().key)}
                        value={String(value() ?? "")}
                        onInput={(event) => props.onChange(field().key, event.currentTarget.value)}
                        placeholder={field().placeholder}
                        required={field().required}
                        disabled={disabled()}
                    />
                </InputShell>
                <FilterHelperText text={field().helperText} />
            </form-field>}
        </Match>

        <Match when={props.field.kind === "date" && props.field}>
            {(field) => <form-field class="flex flex-col gap-2">
                <label for={id()}>{field().label}</label>
                <input
                    id={id()}
                    type="date"
                    value={String(value() ?? "")}
                    min={getDateMin(field(), props.values)}
                    onInput={(event) => props.onChange(field().key, event.currentTarget.value)}
                    disabled={disabled()}
                    required={field().required && !disabled()}
                />
                <FilterHelperText text={field().helperText} />
            </form-field>}
        </Match>

        <Match when={props.field.kind === "number" && props.field}>
            {(field) => <form-field class="flex flex-col gap-2">
                <label for={id()}>{field().label}</label>
                <InputShell icon={field().icon}>
                    <input
                        id={id()}
                        type="number"
                        min={field().min}
                        max={field().max}
                        value={value() ?? ""}
                        onInput={(event) => props.onChange(field().key, parseNumberInput(event.currentTarget.value, field().optional))}
                        placeholder={field().placeholder}
                        disabled={disabled()}
                    />
                </InputShell>
                <FilterHelperText text={field().helperText} />
            </form-field>}
        </Match>

        <Match when={props.field.kind === "select" && props.field}>
            {(field) => <form-field class="flex flex-col gap-2">
                <label for={id()}>{field().label}</label>
                <select id={id()} value={String(value() ?? "")} onInput={(event) => props.onChange(field().key, event.currentTarget.value)} disabled={disabled()}>
                    <For each={field().options}>{(option) =>
                        <option value={option.value}>{option.label}</option>
                    }</For>
                </select>
                <FilterHelperText text={field().helperText} />
            </form-field>}
        </Match>

        <Match when={props.field.kind === "multi-select" && props.field}>
            {(field) => <form-field class="flex flex-col gap-2">
                <label>{field().label}</label>
                <div class="flex flex-wrap gap-2" role="group" aria-label={field().label}>
                    <For each={field().options}>{(option) => {
                        const selected = createMemo(() => {
                            const current = value();
                            return Array.isArray(current) && current.includes(option.value);
                        });

                        return <button
                            type="button"
                            class={selected() ? "tonal" : "outlined"}
                            aria-pressed={selected() ? "true" : "false"}
                            disabled={disabled()}
                            onClick={() => props.onChange(field().key, toggleStringArrayValue(value(), option.value))}
                        >{option.label}</button>;
                    }}</For>
                </div>
                <FilterHelperText text={field().helperText} />
            </form-field>}
        </Match>
    </Switch>;
}

function InputShell(props: {icon?: string; children: Element}) {
    return <Show when={props.icon} fallback={props.children}>
        {(icon) => <input-shell class="outlined flex items-center gap-2">
            <i aria-hidden="true">{icon()}</i>
            {props.children}
        </input-shell>}
    </Show>;
}

function FilterHelperText(props: {text?: string}) {
    return <Show when={props.text}>
        {(text) => <small>{text()}</small>}
    </Show>;
}

function conditionMatches(condition: FlightFilterCondition | undefined, values: FlightFilterValues) {
    if (!condition) return false;

    const value = values[condition.field];
    if ("equals" in condition) return value === condition.equals;
    if ("notEquals" in condition) return value !== condition.notEquals;
    return false;
}

function parseNumberInput(value: string, optional: boolean | undefined) {
    if (!value && optional) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toggleStringArrayValue(value: FlightFilterValue, option: string) {
    const values = Array.isArray(value) ? value : [];
    return values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
}

function getDateMin(field: Extract<FlightFilter, {kind: "date"}>, values: FlightFilterValues) {
    return field.minFromField ? String(values[field.minFromField] ?? "") : field.min;
}

function createSearchRequest(values: FlightFilterValues): FlightSearchRequest {
    const tripType = values.tripType === "one_way" ? "one_way" : "round_trip";

    return {
        tripType,
        departureId: stringValue(values.departureId),
        arrivalId: stringValue(values.arrivalId),
        outboundDate: stringValue(values.outboundDate),
        returnDate: tripType === "round_trip" ? stringValue(values.returnDate) : undefined,
        adults: numberValue(values.adults, 1),
        children: numberValue(values.children, 0),
        infantsInSeat: numberValue(values.infantsInSeat, 0),
        infantsOnLap: numberValue(values.infantsOnLap, 0),
        travelClass: selectValue(values.travelClass, ["1", "2", "3", "4"], "1"),
        stops: selectValue(values.stops, ["0", "1", "2", "3"], "0"),
        bags: numberValue(values.bags, 0),
        maxPrice: typeof values.maxPrice === "number" ? values.maxPrice : undefined,
        currency: stringValue(values.currency) || "USD",
        sortBy: selectValue(values.sortBy, ["1", "2", "3", "4", "5", "6"], "1"),
    };
}

function stringValue(value: FlightFilterValue) {
    return typeof value === "string" ? value : "";
}

function numberValue(value: FlightFilterValue, fallback: number) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function selectValue<const T extends string>(value: FlightFilterValue, allowed: readonly T[], fallback: T) {
    return allowed.includes(value as T) ? value as T : fallback;
}

