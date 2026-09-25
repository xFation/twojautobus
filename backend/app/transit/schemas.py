from pydantic import BaseModel, Field


class ProviderResponse(BaseModel):
	id: str
	name: str
	stops_count: int
	lines_count: int


class StopResponse(BaseModel):
	id: str
	name: str
	latitude: float
	longitude: float


class RouteSearchRequest(BaseModel):
	provider_id: str = Field(description="Id przewoźnika mzk_kielce mzdik_radom ztm_lublin")
	from_stop: str = Field(min_length=1, description="Id / nazwa przystanku początkowego")
	to_stop: str = Field(min_length=1, description="Id / nazwa przystanku końcowego")
	departure_time: str | None = Field(
		default=None,
		pattern=r"^([01]\d|2[0-3]):[0-5]\d$",
		description="Godzina odjazdu w formacie HH:MM domyślnie teraz",
	)
	max_transfers: int = Field(default=1, ge=0, le=1)


class StopTimeResponse(BaseModel):
	stop_id: str
	stop_name: str
	time: str


class LegResponse(BaseModel):
	line: str
	direction: str
	departure_stop: StopTimeResponse
	arrival_stop: StopTimeResponse
	stops: list[StopTimeResponse]
	stops_complete: bool


class TransferResponse(BaseModel):
	stop: StopTimeResponse
	wait_minutes: int


class RouteOptionResponse(BaseModel):
	provider_id: str
	provider_name: str
	departure_time: str
	arrival_time: str
	travel_minutes: int
	transfers_count: int
	legs: list[LegResponse]
	transfers: list[TransferResponse]
	warning: str | None = None


class RouteSearchResponse(BaseModel):
	from_stop: StopResponse
	to_stop: StopResponse
	requested_departure_time: str
	routes: list[RouteOptionResponse]
