from fastapi import APIRouter, HTTPException, Query

from .schemas import ProviderResponse, RouteSearchRequest, RouteSearchResponse, StopResponse
from .services import provider_list, provider_stops, search_routes


router = APIRouter(prefix="/transit", tags=["transit"])


@router.get("/providers", response_model=list[ProviderResponse])
async def get_providers() -> list[dict]:
	return provider_list()


@router.get("/{provider_id}/stops", response_model=list[StopResponse])
async def get_stops(provider_id: str, query: str | None = Query(default=None, min_length=1)) -> list[dict]:
	try:
		return [
			{
				"id": stop.id,
				"name": stop.name,
				"latitude": stop.latitude,
				"longitude": stop.longitude,
				"aliases": list(stop.aliases),
			}
			for stop in provider_stops(provider_id, query)
		]
	except ValueError as error:
		raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/search", response_model=RouteSearchResponse)
async def search(payload: RouteSearchRequest) -> dict:
	try:
		origin, destination, requested, routes = search_routes(
			payload.provider_id,
			payload.from_stop,
			payload.to_stop,
			payload.departure_time,
			payload.max_transfers,
			payload.from_stop_aliases,
			payload.to_stop_aliases,
		)
	except (LookupError, ValueError) as error:
		raise HTTPException(status_code=404, detail=str(error)) from error

	return {
		"from_stop": {"id": origin.id, "name": origin.name, "latitude": origin.latitude, "longitude": origin.longitude},
		"to_stop": {"id": destination.id, "name": destination.name, "latitude": destination.latitude, "longitude": destination.longitude},
		"requested_departure_time": requested,
		"routes": routes,
	}
