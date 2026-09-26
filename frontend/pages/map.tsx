import Head from "next/head";
import { useEffect, useState } from "react";
import StopsMap from "@/components/StopsMap";
import { getProviderStops, getProviders } from "@/lib/api";
import type { Stop, TransitProvider } from "@/types";

export default function MapPage() {
    const [providers, setProviders] = useState<TransitProvider[]>([]);
    const [providerId, setProviderId] = useState("");
    const [stops, setStops] = useState<Stop[]>([]);
    const [message, setMessage] = useState("Wybierz przewoźnika.");
    const [loadingProviders, setLoadingProviders] = useState(true);

    useEffect(() => {
        let active = true;
        getProviders()
            .then((items) => { if (active) setProviders(items); })
            .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Nie udało się pobrać przewoźników."); })
            .finally(() => { if (active) setLoadingProviders(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!providerId) {
            setStops([]);
            setMessage("Wybierz przewoźnika.");
            return;
        }

        let active = true;
        setMessage("Pobieram przystanki...");
        getProviderStops(providerId)
            .then((items) => {
                if (!active) return;
                setStops(items);
                setMessage(`Załadowano przystanków: ${items.length}.`);
            })
            .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Nie udało się pobrać przystanków."); });
        return () => { active = false; };
    }, [providerId]);

    return (
        <>
            <Head><title>Mapa przystanków | Twój Autobus</title></Head>
            <main className="container">
                <h1>Mapa przystanków</h1>
                <p>Wybierz przewoźnika, aby wyświetlić jego przystanki na mapie.</p>
                <div className="map-controls">
                    <label htmlFor="map-provider">Przewoźnik
                        <select id="map-provider" disabled={loadingProviders} onChange={(event) => setProviderId(event.target.value)} value={providerId}>
                            <option value="">{loadingProviders ? "Ładowanie przewoźników..." : "Wybierz przewoźnika"}</option>
                            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                        </select>
                    </label>
                    <span className="muted" role="status">{message}</span>
                </div>
                <StopsMap stops={stops} />
                <p className="muted">Mapa: © OpenStreetMap contributors. Kliknij marker, aby zobaczyć nazwę przystanku.</p>
            </main>
        </>
    );
}