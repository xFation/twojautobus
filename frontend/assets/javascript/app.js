// Change this when the backend is hosted on a different address.
const API_BASE_URL = "http://127.0.0.1:8000";

const elements = {
    apiStatus: document.querySelector("#api-status"),
    providerSelect: document.querySelector("#provider-select"),
    departureTime: document.querySelector("#departure-time"),
    fromInput: document.querySelector("#from-stop"),
    toInput: document.querySelector("#to-stop"),
    fromSuggestions: document.querySelector("#from-suggestions"),
    toSuggestions: document.querySelector("#to-suggestions"),
    maxTransfers: document.querySelector("#max-transfers"),
    form: document.querySelector("#route-form"),
    formError: document.querySelector("#form-error"),
    searchButton: document.querySelector("#search-button"),
    swapButton: document.querySelector("#swap-stops"),
    results: document.querySelector("#results"),
    resultsSection: document.querySelector(".results-section"),
    resultsTitle: document.querySelector("#results-title"),
    resultCount: document.querySelector("#result-count"),
    footerProviderCount: document.querySelector("#footer-provider-count"),
};

const selectedStops = { from: null, to: null };
const suggestionTimers = { from: null, to: null };
const suggestionRequests = { from: 0, to: 0 };

async function apiRequest(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
        });
    } catch {
        throw new Error("Nie można połączyć się z API. Sprawdź, czy backend działa.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || `Błąd serwera (${response.status}).`);
    }
    return data;
}

function setApiStatus(online, message) {
    elements.apiStatus.classList.toggle("is-online", online);
    elements.apiStatus.classList.toggle("is-offline", !online);
    elements.apiStatus.lastChild.textContent = ` ${message}`;
}

function setDefaultTime() {
    const now = new Date();
    const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    elements.departureTime.value = localTime.toISOString().slice(11, 16);
}

async function loadProviders() {
    try {
        const providers = await apiRequest("/transit/providers");
        elements.providerSelect.replaceChildren(new Option("Wybierz przewoźnika", ""));

        for (const provider of providers) {
            elements.providerSelect.add(new Option(provider.name, provider.id));
        }

        elements.providerSelect.disabled = providers.length === 0;
        elements.footerProviderCount.textContent = `${providers.length} przewoźników dostępnych`;
        setApiStatus(true, "API połączone");
    } catch (error) {
        elements.providerSelect.replaceChildren(new Option("Nie udało się pobrać przewoźników", ""));
        setApiStatus(false, "Brak połączenia z API");
        showFormError(error.message);
    }
}

function getStopControls(side) {
    return side === "from"
        ? { input: elements.fromInput, list: elements.fromSuggestions }
        : { input: elements.toInput, list: elements.toSuggestions };
}

function closeSuggestions(side) {
    const { list, input } = getStopControls(side);
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute("aria-expanded", "false");
}

function chooseStop(side, stop) {
    const { input } = getStopControls(side);
    selectedStops[side] = stop;
    input.value = stop.name;
    input.dataset.stopId = stop.id;
    closeSuggestions(side);
    clearFormError();
}

function renderSuggestions(side, stops) {
    const { input, list } = getStopControls(side);
    list.replaceChildren();

    if (stops.length === 0) {
        const message = document.createElement("div");
        message.className = "suggestion-message";
        message.textContent = "Nie znaleziono przystanków";
        list.append(message);
    } else {
        for (const stop of stops.slice(0, 12)) {
            const option = document.createElement("button");
            option.className = "suggestion-option";
            option.type = "button";
            option.setAttribute("role", "option");

            const name = document.createElement("span");
            name.className = "suggestion-name";
            name.textContent = stop.name;

            const id = document.createElement("span");
            id.className = "suggestion-id";
            id.textContent = `ID ${stop.id}`;

            option.append(name, id);
            option.addEventListener("click", () => chooseStop(side, stop));
            list.append(option);
        }
    }

    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
}

async function searchStopSuggestions(side) {
    const { input } = getStopControls(side);
    const query = input.value.trim();
    const providerId = elements.providerSelect.value;
    const requestId = ++suggestionRequests[side];

    selectedStops[side] = null;
    delete input.dataset.stopId;
    if (query.length < 2 || !providerId) {
        closeSuggestions(side);
        return;
    }

    try {
        const params = new URLSearchParams({ query });
        const stops = await apiRequest(
            `/transit/${encodeURIComponent(providerId)}/stops?${params.toString()}`,
        );
        if (requestId === suggestionRequests[side] && query === input.value.trim()) {
            renderSuggestions(side, stops);
        }
    } catch (error) {
        if (requestId === suggestionRequests[side]) {
            renderSuggestions(side, []);
            showFormError(error.message);
        }
    }
}

function scheduleStopSearch(side) {
    clearTimeout(suggestionTimers[side]);
    suggestionTimers[side] = setTimeout(() => searchStopSuggestions(side), 250);
}

function showFormError(message) {
    elements.formError.textContent = message;
    elements.formError.hidden = false;
}

function clearFormError() {
    elements.formError.textContent = "";
    elements.formError.hidden = true;
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function makeStopLine(stopTime, label) {
    const row = makeElement("div", "timeline-stop");
    const marker = makeElement("span", `timeline-marker ${label === "Przyjazd" ? "is-end" : ""}`);
    marker.setAttribute("aria-hidden", "true");
    const details = makeElement("div", "timeline-stop-details");
    details.append(
        makeElement("span", "timeline-label", label),
        makeElement("strong", "timeline-stop-name", stopTime.stop_name),
    );
    row.append(marker, details, makeElement("time", "timeline-time", stopTime.time));
    return row;
}

function renderRoute(route, index) {
    const card = makeElement("article", "route-card");
    const header = makeElement("div", "route-card-header");
    const summary = makeElement("div", "route-summary");
    const times = makeElement("div", "route-times");
    const duration = makeElement("span", "route-duration", `${route.travel_minutes} min`);
    const transfersText = route.transfers_count === 0
        ? "Bez przesiadek"
        : `${route.transfers_count} przesiadka`;

    times.append(
        makeElement("strong", "route-time", route.departure_time),
        makeElement("span", "route-time-arrow", "→"),
        makeElement("strong", "route-time", route.arrival_time),
    );
    summary.append(times, makeElement("span", "route-meta", `${route.provider_name} · ${transfersText}`));
    header.append(summary, duration);
    card.append(header);

    route.legs.forEach((leg, legIndex) => {
        const section = makeElement("section", "route-leg");
        const legHeader = makeElement("div", "leg-header");
        legHeader.append(
            makeElement("span", "line-badge", `Linia ${leg.line}`),
            makeElement("span", "leg-direction", `Kierunek: ${leg.direction}`),
        );

        const timeline = makeElement("div", "route-timeline");
        timeline.append(
            makeStopLine(leg.departure_stop, "Odjazd"),
            makeStopLine(leg.arrival_stop, "Przyjazd"),
        );
        section.append(legHeader, timeline);

        const transfer = route.transfers[legIndex];
        if (transfer) {
            const transferNote = makeElement("div", "transfer-note");
            transferNote.append(
                makeElement("span", "transfer-icon", "↳"),
                makeElement(
                    "span",
                    "transfer-copy",
                    `Przesiadka na przystanku ${transfer.stop.stop_name}`,
                ),
                makeElement("strong", "transfer-wait", `oczekiwanie ${transfer.wait_minutes} min`),
            );
            section.append(transferNote);
        }
        card.append(section);
    });

    if (route.warning) {
        card.append(makeElement("p", "route-warning", route.warning));
    }

    card.setAttribute("aria-label", `Wariant ${index + 1}, odjazd ${route.departure_time}`);
    return card;
}

function showEmptyState(message) {
    elements.results.replaceChildren();
    const empty = makeElement("div", "empty-state");
    empty.append(
        makeElement("span", "empty-icon", "→"),
        makeElement("p", "", message),
    );
    elements.results.append(empty);
    elements.resultCount.textContent = "";
}

function renderRoutes(data) {
    elements.results.replaceChildren();
    elements.resultsTitle.textContent = `${data.from_stop.name} → ${data.to_stop.name}`;

    if (data.routes.length === 0) {
        showEmptyState("Nie znaleziono połączeń dla wybranej trasy i godziny.");
        return;
    }

    elements.resultCount.textContent = `${data.routes.length} ${data.routes.length === 1 ? "wariant" : "warianty"}`;
    data.routes.forEach((route, index) => elements.results.append(renderRoute(route, index)));
}

async function submitRouteSearch(event) {
    event.preventDefault();
    clearFormError();

    if (!elements.providerSelect.value) {
        showFormError("Najpierw wybierz przewoźnika.");
        elements.providerSelect.focus();
        return;
    }
    if (!selectedStops.from || !selectedStops.to) {
        showFormError("Wybierz przystanek początkowy i końcowy z podpowiedzi.");
        (!selectedStops.from ? elements.fromInput : elements.toInput).focus();
        return;
    }
    if (selectedStops.from.id === selectedStops.to.id) {
        showFormError("Przystanek początkowy i końcowy muszą być różne.");
        return;
    }

    elements.searchButton.disabled = true;
    elements.searchButton.querySelector("span:last-child").textContent = "Szukam...";
    elements.resultsSection.setAttribute("aria-busy", "true");
    showEmptyState("Szukam dostępnych połączeń...");

    try {
        const data = await apiRequest("/transit/search", {
            method: "POST",
            body: JSON.stringify({
                provider_id: elements.providerSelect.value,
                from_stop: selectedStops.from.id,
                to_stop: selectedStops.to.id,
                departure_time: elements.departureTime.value || null,
                max_transfers: Number(elements.maxTransfers.value),
            }),
        });
        renderRoutes(data);
    } catch (error) {
        showEmptyState("Nie udało się pobrać połączeń.");
        showFormError(error.message);
    } finally {
        elements.searchButton.disabled = false;
        elements.searchButton.querySelector("span:last-child").textContent = "Szukaj połączeń";
        elements.resultsSection.setAttribute("aria-busy", "false");
    }
}

function swapStops() {
    const fromValue = elements.fromInput.value;
    const toValue = elements.toInput.value;
    const fromStop = selectedStops.from;
    const toStop = selectedStops.to;

    elements.fromInput.value = toValue;
    elements.toInput.value = fromValue;
    selectedStops.from = toStop;
    selectedStops.to = fromStop;

    if (toStop) elements.fromInput.dataset.stopId = toStop.id;
    else delete elements.fromInput.dataset.stopId;
    if (fromStop) elements.toInput.dataset.stopId = fromStop.id;
    else delete elements.toInput.dataset.stopId;

    closeSuggestions("from");
    closeSuggestions("to");
    clearFormError();
}

elements.providerSelect.addEventListener("change", () => {
    selectedStops.from = null;
    selectedStops.to = null;
    elements.fromInput.value = "";
    elements.toInput.value = "";
    delete elements.fromInput.dataset.stopId;
    delete elements.toInput.dataset.stopId;
    closeSuggestions("from");
    closeSuggestions("to");
    clearFormError();
});

elements.fromInput.addEventListener("input", () => scheduleStopSearch("from"));
elements.toInput.addEventListener("input", () => scheduleStopSearch("to"));
elements.fromInput.addEventListener("focus", () => scheduleStopSearch("from"));
elements.toInput.addEventListener("focus", () => scheduleStopSearch("to"));
elements.form.addEventListener("submit", submitRouteSearch);
elements.swapButton.addEventListener("click", swapStops);

document.addEventListener("click", (event) => {
    if (!event.target.closest(".stop-field")) {
        closeSuggestions("from");
        closeSuggestions("to");
    }
});

setDefaultTime();
loadProviders();