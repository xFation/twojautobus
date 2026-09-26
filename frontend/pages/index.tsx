import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import StopAutocomplete from "@/components/StopAutocomplete";
import { getProviders } from "@/lib/api";
import type { RouteSearchRequest, Stop, TransitProvider } from "@/types";

export default function HomePage() {
    const router = useRouter();
    const [providers, setProviders] = useState<TransitProvider[]>([]);
    const [providerId, setProviderId] = useState("");
    const [fromStop, setFromStop] = useState<Stop | null>(null);
    const [toStop, setToStop] = useState<Stop | null>(null);
    const [fromQuery, setFromQuery] = useState("");
    const [toQuery, setToQuery] = useState("");
    const [departureTime, setDepartureTime] = useState("");
    const [maxTransfers, setMaxTransfers] = useState<0 | 1>(1);
    const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
    const [error, setError] = useState("");

    useEffect(() => {
        const now = new Date();
        const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
        setDepartureTime(localTime.toISOString().slice(11, 16));

        let active = true;
        getProviders()
            .then((items) => {
                if (!active) return;
                setProviders(items);
                setApiStatus("online");
            })
            .catch(() => {
                if (active) setApiStatus("offline");
            });
        return () => { active = false; };
    }, []);

    function handleProviderChange(value: string) {
        setProviderId(value);
        setFromStop(null);
        setToStop(null);
        setFromQuery("");
        setToQuery("");
        setError("");
    }

    function swapStops() {
        setFromStop(toStop);
        setToStop(fromStop);
        setFromQuery(toStop?.name ?? "");
        setToQuery(fromStop?.name ?? "");
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (!providerId || !fromStop || !toStop) {
            setError("Wybierz przewoźnika i oba przystanki z podpowiedzi.");
            return;
        }
        if (fromStop.id === toStop.id) {
            setError("Wybierz dwa różne przystanki.");
            return;
        }

        const search: RouteSearchRequest = {
            provider_id: providerId,
            from_stop: fromStop.id,
            to_stop: toStop.id,
            departure_time: departureTime || null,
            max_transfers: maxTransfers,
        };
        window.sessionStorage.setItem("routeSearch", JSON.stringify(search));
        void router.push("/wyniki");
    }

    return (
        <>
            <Head>
                <title>Twój Autobus | Plan podróży</title>
                <meta name="description" content="Znajdź połączenie autobusowe i zaplanuj podróż." />
            </Head>
            <main id="top" className="page-shell">
                <section className="intro" aria-labelledby="page-title">
                    <p className="eyebrow">PODRÓŻ ZACZYNA SIĘ TUTAJ</p>
                    <h1 id="page-title">Dokąd dziś <span>jedziesz?</span></h1>
                    <p className="intro-copy">Wybierz przewoźnika i przystanki. Znajdziemy dostępne połączenia.</p>
                    <span className={`network-status is-${apiStatus}`} role="status">
                        <span className="status-dot" aria-hidden="true" />
                        {apiStatus === "loading" ? "Łączenie z API..." : apiStatus === "online" ? "API połączone" : "API niedostępne"}
                    </span>
                </section>

                <section className="planner" aria-label="Wyszukiwarka połączeń">
                    <form onSubmit={handleSubmit}>
                        <div className="form-topline">
                            <label className="field provider-field" htmlFor="provider-select">
                                <span className="field-label">PRZEWOŹNIK</span>
                                <select
                                    id="provider-select"
                                    onChange={(event) => handleProviderChange(event.target.value)}
                                    required
                                    value={providerId}
                                    disabled={apiStatus !== "online"}
                                >
                                    <option value="">{apiStatus === "loading" ? "Ładowanie przewoźników..." : "Wybierz przewoźnika"}</option>
                                    {providers.map((provider) => (
                                        <option key={provider.id} value={provider.id}>{provider.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="field time-field" htmlFor="departure-time">
                                <span className="field-label">ODJAZD PO</span>
                                <input id="departure-time" onChange={(event) => setDepartureTime(event.target.value)} type="time" value={departureTime} />
                            </label>
                        </div>

                        <div className="journey-fields">
                            <StopAutocomplete
                                id="from-stop"
                                label="PRZYSTANEK POCZĄTKOWY"
                                marker="start"
                                onSelect={setFromStop}
                                onValueChange={setFromQuery}
                                placeholder="Wpisz nazwę przystanku"
                                providerId={providerId}
                                selectedStop={fromStop}
                                value={fromQuery}
                            />
                            <button className="swap-button" onClick={swapStops} type="button" aria-label="Zamień przystanki" title="Zamień przystanki">
                                <span aria-hidden="true">&#8645;</span>
                            </button>
                            <StopAutocomplete
                                id="to-stop"
                                label="PRZYSTANEK KOŃCOWY"
                                marker="end"
                                onSelect={setToStop}
                                onValueChange={setToQuery}
                                placeholder="Dokąd chcesz dojechać?"
                                providerId={providerId}
                                selectedStop={toStop}
                                value={toQuery}
                            />
                        </div>

                        <div className="form-bottomline">
                            <label className="transfers-field" htmlFor="max-transfers">
                                <span>Przesiadki</span>
                                <select id="max-transfers" onChange={(event) => setMaxTransfers(Number(event.target.value) as 0 | 1)} value={maxTransfers}>
                                    <option value={0}>Bez przesiadki</option>
                                    <option value={1}>Maksymalnie 1</option>
                                </select>
                            </label>
                            <button className="search-button" type="submit">
                                <span className="button-icon" aria-hidden="true">&#8594;</span>
                                <span>Szukaj połączeń</span>
                            </button>
                        </div>
                        {error && <p className="form-error" role="alert">{error}</p>}
                    </form>
                </section>
            </main>
        </>
    );
}