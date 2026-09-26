const pageElements = {
    apiStatus: document.querySelector("#api-status"),
    provider: document.querySelector("#provider-select"),
    from: document.querySelector("#from-stop"),
    to: document.querySelector("#to-stop"),
    fromList: document.querySelector("#from-suggestions"),
    toList: document.querySelector("#to-suggestions"),
    message: document.querySelector("#form-error"),
    form: document.querySelector("#route-form"),
};

const selectedStops = { from: null, to: null };
const stopSearchTimers = { from: null, to: null };
const stopSearchNumbers = { from: 0, to: 0 };

function controlsFor(side) {
    return side === "from"
        ? { input: pageElements.from, list: pageElements.fromList }
        : { input: pageElements.to, list: pageElements.toList };
}

async function loadProviders() {
    try {
        const providers = await window.apiRequest("/transit/providers");
        pageElements.provider.replaceChildren(new Option("Wybierz przewoźnika", ""));
        providers.forEach((provider) => pageElements.provider.add(new Option(provider.name, provider.id)));
        pageElements.provider.disabled = false;
        if (pageElements.apiStatus) {
            pageElements.apiStatus.classList.add("is-online");
            pageElements.apiStatus.lastChild.textContent = " API połączone";
        }
        const count = document.querySelector("#footer-provider-count");
        if (count) count.textContent = `${providers.length} przewoźników dostępnych`;
    } catch (error) {
        pageElements.provider.replaceChildren(new Option("Nie można pobrać przewoźników", ""));
        showError(error.message);
        if (pageElements.apiStatus) {
            pageElements.apiStatus.classList.add("is-offline");
            pageElements.apiStatus.lastChild.textContent = " API niedostępne";
        }
    }
}

function closeSuggestions(side) {
    const { input, list } = controlsFor(side);
    list.hidden = true;
    list.replaceChildren();
}

function selectStop(side, stop) {
    const { input } = controlsFor(side);
    selectedStops[side] = stop;
    input.value = stop.name;
    closeSuggestions(side);
    pageElements.message.hidden = true;
}

function showSuggestions(side, stops) {
    const { input, list } = controlsFor(side);
    list.replaceChildren();
    for (const stop of stops.slice(0, 12)) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "suggestion-option";
        const name = document.createElement("span");
        name.textContent = stop.name;
        const id = document.createElement("span");
        id.className = "suggestion-id";
        id.textContent = `ID ${stop.id}`;
        option.append(name, id);
        option.addEventListener("click", () => selectStop(side, stop));
        list.append(option);
    }
    if (stops.length === 0) {
        const empty = document.createElement("div");
        empty.className = "suggestion-message";
        empty.textContent = "Nie znaleziono przystanków";
        list.append(empty);
    }
    list.hidden = false;
}

async function searchStops(side) {
    const { input } = controlsFor(side);
    const query = input.value.trim();
    const providerId = pageElements.provider.value;
    const requestNumber = ++stopSearchNumbers[side];
    selectedStops[side] = null;

    if (query.length < 2 || !providerId) {
        closeSuggestions(side);
        return;
    }

    try {
        const params = new URLSearchParams({ query });
        const stops = await window.apiRequest(
            `/transit/${encodeURIComponent(providerId)}/stops?${params}`,
        );
        if (requestNumber === stopSearchNumbers[side] && query === input.value.trim()) {
            showSuggestions(side, stops);
        }
    } catch (error) {
        showError(error.message);
    }
}

function scheduleStopSearch(side) {
    clearTimeout(stopSearchTimers[side]);
    stopSearchTimers[side] = setTimeout(() => searchStops(side), 250);
}

function showError(text) {
    pageElements.message.textContent = text;
    pageElements.message.hidden = false;
}

pageElements.provider.addEventListener("change", () => {
    selectedStops.from = null;
    selectedStops.to = null;
    pageElements.from.value = "";
    pageElements.to.value = "";
    closeSuggestions("from");
    closeSuggestions("to");
});
pageElements.from.addEventListener("input", () => scheduleStopSearch("from"));
pageElements.to.addEventListener("input", () => scheduleStopSearch("to"));
pageElements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    pageElements.message.hidden = true;

    if (!pageElements.provider.value || !selectedStops.from || !selectedStops.to) {
        showError("Wybierz przewoźnika i oba przystanki z podpowiedzi.");
        return;
    }
    if (selectedStops.from.id === selectedStops.to.id) {
        showError("Wybierz dwa różne przystanki.");
        return;
    }

    const search = {
        provider_id: pageElements.provider.value,
        from_stop: selectedStops.from.id,
        to_stop: selectedStops.to.id,
        departure_time: document.querySelector("#departure-time").value || null,
        max_transfers: Number(document.querySelector("#max-transfers").value),
    };
    sessionStorage.setItem("routeSearch", JSON.stringify(search));
    window.location.href = "wyniki.html";
});

document.querySelector("#swap-stops").addEventListener("click", () => {
    const oldFrom = selectedStops.from;
    selectedStops.from = selectedStops.to;
    selectedStops.to = oldFrom;
    pageElements.from.value = selectedStops.from?.name || "";
    pageElements.to.value = selectedStops.to?.name || "";
    closeSuggestions("from");
    closeSuggestions("to");
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".stop-field")) {
        closeSuggestions("from");
        closeSuggestions("to");
    }
});

loadProviders();