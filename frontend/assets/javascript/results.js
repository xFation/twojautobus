const resultsContainer = document.querySelector("#route-results");
const resultsMessage = document.querySelector("#results-message");

function addText(parent, tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
}

function renderRoute(route) {
    const card = document.createElement("article");
    card.className = "route-card";
    addText(card, "h2", `${route.departure_time} - ${route.arrival_time}`);
    addText(card, "p", `${route.provider_name} | podróż: ${route.travel_minutes} min`);

    route.legs.forEach((leg, index) => {
        const section = document.createElement("section");
        section.className = "route-leg";
        addText(section, "h3", `Autobus ${leg.line} - kierunek ${leg.direction}`);
        addText(section, "p", `Odjazd ${leg.departure_stop.time}: ${leg.departure_stop.stop_name}`);
        addText(section, "p", `Przyjazd ${leg.arrival_stop.time}: ${leg.arrival_stop.stop_name}`);

        const transfer = route.transfers[index];
        if (transfer) {
            addText(
                section,
                "p",
                `Przesiadka: ${transfer.stop.stop_name}. Oczekiwanie: ${transfer.wait_minutes} min.`,
                "transfer-note",
            );
        }
        card.append(section);
    });

    if (route.warning) addText(card, "p", route.warning, "route-warning");
    return card;
}

async function loadResults() {
    const savedSearch = sessionStorage.getItem("routeSearch");
    if (!savedSearch) {
        resultsMessage.textContent = "Nie zapisano wyszukiwania. Wróć na stronę startową.";
        return;
    }

    try {
        const data = await window.apiRequest("/transit/search", {
            method: "POST",
            body: savedSearch,
        });
        if (data.routes.length === 0) {
            resultsMessage.textContent = `Brak połączeń: ${data.from_stop.name} → ${data.to_stop.name}.`;
            return;
        }
        resultsMessage.textContent = `${data.from_stop.name} → ${data.to_stop.name}`;
        data.routes.forEach((route) => resultsContainer.append(renderRoute(route)));
    } catch (error) {
        resultsMessage.textContent = error.message;
    }
}

loadResults();