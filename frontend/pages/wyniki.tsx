import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import RouteOption from "@/components/RouteOption";
import { searchRoutes } from "@/lib/api";
import type { RouteSearchRequest, RouteSearchResponse } from "@/types";

export default function ResultsPage() {
    const [result, setResult] = useState<RouteSearchResponse | null>(null);
    const [message, setMessage] = useState("Pobieram połączenia...");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedSearch = window.sessionStorage.getItem("routeSearch");
        if (!savedSearch) {
            setMessage("Nie zapisano wyszukiwania. Wróć do planera i wybierz trasę.");
            setLoading(false);
            return;
        }

        let active = true;
        try {
            const request = JSON.parse(savedSearch) as RouteSearchRequest;
            searchRoutes(request)
                .then((data) => {
                    if (!active) return;
                    setResult(data);
                    setMessage(data.routes.length ? `${data.from_stop.name} → ${data.to_stop.name}` : `Nie znaleziono połączeń: ${data.from_stop.name} → ${data.to_stop.name}.`);
                })
                .catch((error: unknown) => {
                    if (active) setMessage(error instanceof Error ? error.message : "Błąd pobierania wyników.");
                })
                .finally(() => {
                    if (active) setLoading(false);
                });
        } catch {
            setMessage("Zapisane wyszukiwanie jest nieprawidłowe. Wróć do planera.");
            setLoading(false);
        }

        return () => { active = false; };
    }, []);

    return (
        <>
            <Head><title>Wyniki wyszukiwania | Twój Autobus</title></Head>
            <main className="container results-page">
                <h1>Wyniki wyszukiwania</h1>
                <p className="message" role="status">{message}</p>
                {loading && <p>Ładowanie...</p>}
                {result?.routes.map((route, index) => (
                    <RouteOption key={`${route.provider_id}-${index}`} index={index} route={route} />
                ))}
                <p><Link href="/">Wróć do wyszukiwarki</Link></p>
            </main>
        </>
    );
}