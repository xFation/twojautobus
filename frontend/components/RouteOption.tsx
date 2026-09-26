import type { RouteOption as RouteOptionData } from "@/types";

interface RouteOptionProps {
    route: RouteOptionData;
    index: number;
}

export default function RouteOption({ route, index }: RouteOptionProps) {
    const transferLabel = route.transfers_count === 0
        ? "Bez przesiadek"
        : `${route.transfers_count} przesiadka`;

    return (
        <article className="route-card" aria-label={`Wariant ${index + 1}`}>
            <div className="route-card-header">
                <div className="route-summary">
                    <div className="route-times">
                        <strong className="route-time">{route.departure_time}</strong>
                        <span className="route-time-arrow" aria-hidden="true">→</span>
                        <strong className="route-time">{route.arrival_time}</strong>
                    </div>
                    <span className="route-meta">{route.provider_name} · {transferLabel}</span>
                </div>
                <span className="route-duration">{route.travel_minutes} min</span>
            </div>

            {route.legs.map((leg, legIndex) => {
                const stops = leg.stops.length ? leg.stops : [leg.departure_stop, leg.arrival_stop];
                return (
                    <section className="route-leg" key={`${leg.line}-${legIndex}`}>
                        <div className="leg-header">
                            <span className="line-badge">Linia {leg.line}</span>
                            <span className="leg-direction">Kierunek: {leg.direction}</span>
                        </div>
                        <div className="route-timeline">
                            {stops.map((stop, stopIndex) => (
                                <div className="timeline-stop" key={`${stop.stop_id}-${stopIndex}`}>
                                    <span className={`timeline-marker ${stopIndex === stops.length - 1 ? "is-end" : ""}`} aria-hidden="true" />
                                    <span className="timeline-stop-details">
                                        <span className="timeline-label">
                                            {stopIndex === 0 ? "Odjazd" : stopIndex === stops.length - 1 ? "Przyjazd" : "Przystanek"}
                                        </span>
                                        <strong className="timeline-stop-name">{stop.stop_name}</strong>
                                    </span>
                                    <time className="timeline-time">{stop.time}</time>
                                </div>
                            ))}
                        </div>
                        {route.transfers[legIndex] && (
                            <p className="transfer-note">
                                Przesiadka: {route.transfers[legIndex].stop.stop_name}. Oczekiwanie: {route.transfers[legIndex].wait_minutes} min.
                            </p>
                        )}
                    </section>
                );
            })}

            {route.warning && <p className="route-warning">{route.warning}</p>}
        </article>
    );
}