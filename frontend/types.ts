export interface TransitProvider {
    id: string;
    name: string;
    stops_count: number;
    lines_count: number;
}

export interface Stop {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    aliases?: string[];
}

export interface StopTime {
    stop_id: string;
    stop_name: string;
    time: string;
}

export interface RouteLeg {
    line: string;
    direction: string;
    departure_stop: StopTime;
    arrival_stop: StopTime;
    stops: StopTime[];
    stops_complete: boolean;
}

export interface RouteTransfer {
    stop: StopTime;
    wait_minutes: number;
}

export interface RouteOption {
    provider_id: string;
    provider_name: string;
    departure_time: string;
    arrival_time: string;
    travel_minutes: number;
    transfers_count: number;
    legs: RouteLeg[];
    transfers: RouteTransfer[];
    warning: string | null;
}

export interface RouteSearchRequest {
    provider_id: string;
    from_stop: string;
    to_stop: string;
    from_stop_aliases?: string[];
    to_stop_aliases?: string[];
    departure_time: string | null;
    max_transfers: 0 | 1;
}

export interface RouteSearchResponse {
    from_stop: Stop;
    to_stop: Stop;
    requested_departure_time: string;
    routes: RouteOption[];
}

export interface AuthUser {
    id: number;
    email: string;
    name: string;
    birthdate: string | null;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: AuthUser;
}