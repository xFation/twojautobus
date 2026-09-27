from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.database import (
    get_departures,
    get_line_stops,
    get_provider,
    get_providers,
    get_stops,
    get_stop_suggestions,
)


@dataclass(frozen=True)
class Stop:
    id: str
    name: str
    latitude: float
    longitude: float
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class Departure:
    line: str
    direction: str
    time: int


def _minutes(value: str) -> int:
    hours, minutes = (int(part) for part in value.split(":", 1))
    return hours * 60 + minutes


def _time(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


def _stop_from_row(item: dict[str, Any]) -> Stop:
    return Stop(
        id=str(item["id"]),
        name=item["name"],
        latitude=float(item["latitude"]),
        longitude=float(item["longitude"]),
        aliases=tuple(item.get("aliases", [])),
    )


class TransitProvider:

    def __init__(self, provider_id: str):
        self.id = provider_id
        provider = get_provider(provider_id)
        if provider is None:
            raise ValueError(f"Nieznany przewoźnik: {provider_id}")
        self.name = provider["name"]
        self.stops = {stop.id: stop for stop in (_stop_from_row(row) for row in get_stops(provider_id))}
        self.line_stops = get_line_stops(provider_id)
        self._departures_cache: dict[str, list[Departure]] = {}

    def find_stop(self, query: str) -> Stop:
        normalized = query.casefold().strip()
        exact = next((stop for stop in self.stops.values() if stop.id == query.strip()), None)
        if exact:
            return exact
        matches = [stop for stop in self.stops.values() if normalized in stop.name.casefold()]
        if not matches:
            raise LookupError(f"Nie znaleziono przystanku: {query}")
        return matches[0]

    def find_stop_candidates(self, query: str, aliases: list[str] | None = None) -> list[Stop]:
        selected_stop = self.find_stop(query)
        selected_name = selected_stop.name.strip().casefold()
        candidate_ids = dict.fromkeys([selected_stop.id, *(aliases or [])])
        candidates = [
            self.stops[stop_id]
            for stop_id in candidate_ids
            if stop_id in self.stops and self.stops[stop_id].name.strip().casefold() == selected_name
        ]
        return candidates or [selected_stop]

    def departures_for(self, stop_id: str, line: str | None = None) -> list[Departure]:
        if stop_id not in self._departures_cache:
            rows = get_departures(self.id, stop_id)
            self._departures_cache[stop_id] = [
                Departure(row["line_id"], row["direction"], int(row["departure_minutes"]))
                for row in rows
            ]
        departures = self._departures_cache[stop_id]
        return [departure for departure in departures if line is None or departure.line == line]

    def next_departure(self, stop_id: str, line: str, after: int, direction: str | None = None) -> Departure | None:
        return next(
            (
                departure
                for departure in self.departures_for(stop_id, line)
                if departure.time >= after and (direction is None or departure.direction == direction)
            ),
            None,
        )

    def lines_at(self, stop_id: str) -> set[str]:
        return {departure.line for departure in self.departures_for(stop_id)}

    def stop_time(self, stop_id: str, time: int) -> dict[str, Any]:
        stop = self.stops[stop_id]
        return {"stop_id": stop.id, "stop_name": stop.name, "time": _time(time)}


def provider_list() -> list[dict[str, Any]]:
    return get_providers()


def provider_stops(provider_id: str, query: str | None = None) -> list[Stop]:
    if get_provider(provider_id) is None:
        raise ValueError(f"Nieznany przewoźnik: {provider_id}")
    rows = get_stop_suggestions(provider_id, query) if query else get_stops(provider_id)
    return [_stop_from_row(row) for row in rows]


def _direct_route(provider: TransitProvider, origin: Stop, destination: Stop, requested: int) -> dict[str, Any] | None:
    shared_lines = provider.lines_at(origin.id) & provider.lines_at(destination.id)
    candidates = []
    for line in shared_lines:
        for departure in provider.departures_for(origin.id, line):
            if departure.time < requested:
                continue
            arrival = provider.next_departure(destination.id, line, departure.time + 1, departure.direction)
            if arrival:
                candidates.append((departure, arrival))
    if not candidates:
        return None
    departure, arrival = min(candidates, key=lambda item: item[1].time)
    return _route_option(provider, origin, destination, [(departure, arrival, None)])


def _one_transfer_route(provider: TransitProvider, origin: Stop, destination: Stop, requested: int) -> dict[str, Any] | None:
    candidates = []
    origin_lines = provider.lines_at(origin.id)
    destination_lines = provider.lines_at(destination.id)
    for first_line in origin_lines:
        for second_line in destination_lines - {first_line}:
            transfer_stops = provider.line_stops.get(first_line, set()) & provider.line_stops.get(second_line, set())
            for transfer_id in transfer_stops - {origin.id, destination.id}:
                first = provider.next_departure(origin.id, first_line, requested)
                if not first:
                    continue
                arrived = provider.next_departure(transfer_id, first_line, first.time + 1, first.direction)
                if not arrived:
                    continue
                second = provider.next_departure(transfer_id, second_line, arrived.time)
                if not second:
                    continue
                final = provider.next_departure(destination.id, second_line, second.time + 1, second.direction)
                if final:
                    candidates.append((first, arrived, second, final, transfer_id))
    if not candidates:
        return None
    first, arrived, second, final, transfer_id = min(candidates, key=lambda item: item[3].time)
    return _route_option(provider, origin, destination, [(first, arrived, transfer_id), (second, final, transfer_id)])


def _route_option(provider: TransitProvider, origin: Stop, destination: Stop, legs: list[tuple[Departure, Departure, str | None]]) -> dict[str, Any]:
    response_legs = []
    transfers = []
    for index, (departure, arrival, transfer_id) in enumerate(legs):
        departure_stop_id = origin.id if index == 0 else legs[index - 1][2]
        arrival_stop_id = destination.id if index == len(legs) - 1 else transfer_id
        response_legs.append(
            {
                "line": departure.line,
                "direction": departure.direction,
                "departure_stop": provider.stop_time(departure_stop_id, departure.time),
                "arrival_stop": provider.stop_time(arrival_stop_id, arrival.time),
                "stops": [
                    provider.stop_time(departure_stop_id, departure.time),
                    provider.stop_time(arrival_stop_id, arrival.time),
                ],
                "stops_complete": False,
            }
        )
        if index < len(legs) - 1:
            next_departure = legs[index + 1][0]
            transfers.append(
                {
                    "stop": provider.stop_time(transfer_id, arrival.time),
                    "wait_minutes": next_departure.time - arrival.time,
                }
            )
    start = legs[0][0].time
    end = legs[-1][1].time
    return {
        "provider_id": provider.id,
        "provider_name": provider.name,
        "departure_time": _time(start),
        "arrival_time": _time(end),
        "travel_minutes": end - start,
        "transfers_count": len(transfers),
        "legs": response_legs,
        "transfers": transfers,
        "warning": "Dane rozkładowe nie zawierają pełnego przebiegu linii; lista przystanków jest obecnie skrócona do punktów trasy.",
    }


def search_routes(
    provider_id: str,
    from_stop: str,
    to_stop: str,
    departure_time: str | None,
    max_transfers: int,
    from_stop_aliases: list[str] | None = None,
    to_stop_aliases: list[str] | None = None,
) -> tuple[Stop, Stop, str, list[dict[str, Any]]]:
    provider = TransitProvider(provider_id)
    origin_candidates = provider.find_stop_candidates(from_stop, from_stop_aliases)
    destination_candidates = provider.find_stop_candidates(to_stop, to_stop_aliases)
    origin = origin_candidates[0]
    destination = destination_candidates[0]
    requested = _minutes(departure_time) if departure_time else datetime.now().hour * 60 + datetime.now().minute

    routes = []
    seen_routes: set[tuple[Any, ...]] = set()
    for candidate_origin in origin_candidates:
        for candidate_destination in destination_candidates:
            if candidate_origin.id == candidate_destination.id:
                continue

            candidates = [_direct_route(provider, candidate_origin, candidate_destination, requested)]
            if max_transfers:
                candidates.append(_one_transfer_route(provider, candidate_origin, candidate_destination, requested))

            for route in candidates:
                if route is None:
                    continue
                signature = (
                    route["departure_time"],
                    route["arrival_time"],
                    tuple(
                        (
                            leg["line"],
                            leg["departure_stop"]["time"],
                            leg["arrival_stop"]["time"],
                            leg["arrival_stop"]["stop_name"],
                        )
                        for leg in route["legs"]
                    ),
                )
                if signature not in seen_routes:
                    seen_routes.add(signature)
                    routes.append(route)

    routes.sort(key=lambda route: (_minutes(route["arrival_time"]), route["transfers_count"]))
    if routes:
        origin = provider.stops[routes[0]["legs"][0]["departure_stop"]["stop_id"]]
        destination = provider.stops[routes[0]["legs"][-1]["arrival_stop"]["stop_id"]]
    return origin, destination, _time(requested), routes[:5]