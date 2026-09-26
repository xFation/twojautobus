const providerSelect = document.querySelector("#map-provider");
const mapMessage = document.querySelector("#map-message");
let stopMap;
let stopMarkers;

function initializeMap() {
    if (!window.L) {
        mapMessage.textContent = "Nie załadowała się mapa. Sprawdź połączenie z internetem.";
        return;
    }
    stopMap = L.map("map").setView([51.1, 19.4], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(stopMap);
    stopMarkers = L.layerGroup().addTo(stopMap);
}

async function loadProviders() {
    try {
        const providers = await window.apiRequest("/transit/providers");
        providerSelect.replaceChildren(new Option("Wybierz przewoźnika", ""));
        providers.forEach((provider) => providerSelect.add(new Option(provider.name, provider.id)));
    } catch (error) {
        mapMessage.textContent = error.message;
    }
}

async function loadProviderStops() {
    stopMarkers.clearLayers();
    if (!providerSelect.value) {
        mapMessage.textContent = "Wybierz przewoźnika.";
        return;
    }

    providerSelect.disabled = true;
    mapMessage.textContent = "Pobieram przystanki...";
    try {
        const stops = await window.apiRequest(
            `/transit/${encodeURIComponent(providerSelect.value)}/stops`,
        );
        const bounds = [];
        stops.forEach((stop) => {
            if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) return;
            const marker = L.circleMarker([stop.latitude, stop.longitude], {
                radius: 5,
                color: "#245943",
                fillColor: "#f4b942",
                fillOpacity: 0.9,
            });
            const popup = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = stop.name;
            const id = document.createElement("div");
            id.textContent = `ID przystanku: ${stop.id}`;
            popup.append(name, id);
            marker.bindPopup(popup).addTo(stopMarkers);
            bounds.push([stop.latitude, stop.longitude]);
        });

        if (bounds.length) stopMap.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        mapMessage.textContent = `Załadowano przystanków: ${bounds.length}.`;
    } catch (error) {
        mapMessage.textContent = error.message;
    } finally {
        providerSelect.disabled = false;
    }
}

providerSelect.addEventListener("change", loadProviderStops);
initializeMap();
loadProviders();