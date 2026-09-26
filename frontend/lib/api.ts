import type {
    AuthUser,
    AuthResponse,
    RouteSearchRequest,
    RouteSearchResponse,
    Stop,
    TransitProvider,
} from "@/types";

function getApiBaseUrl(): string {
    const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
    if (configuredUrl) return configuredUrl.replace(/\/$/, "");

    if (typeof window === "undefined") return "http://127.0.0.1:8000";
    const frontendDevPorts = new Set(["3000", "5500", "5173"]);
    if (frontendDevPorts.has(window.location.port)) {
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return window.location.origin;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    let response: Response;
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    try {
        response = await fetch(`${getApiBaseUrl()}${path}`, {
            ...options,
            headers,
        });
    } catch {
        throw new Error("Nie można połączyć się z backendem. Sprawdź, czy API działa.");
    }

    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail =
            typeof data === "object" && data !== null && "detail" in data
                ? String(data.detail)
                : `Błąd API: ${response.status}`;
        throw new Error(detail);
    }
    return data as T;
}

export const getProviders = () => apiRequest<TransitProvider[]>("/transit/providers");

export function searchStops(providerId: string, query: string): Promise<Stop[]> {
    const params = new URLSearchParams({ query });
    return apiRequest<Stop[]>(`/transit/${encodeURIComponent(providerId)}/stops?${params}`);
}

export function getProviderStops(providerId: string): Promise<Stop[]> {
    return apiRequest<Stop[]>(`/transit/${encodeURIComponent(providerId)}/stops`);
}

export function searchRoutes(request: RouteSearchRequest): Promise<RouteSearchResponse> {
    return apiRequest<RouteSearchResponse>("/transit/search", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export function login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export function registerUser(user: {
    email: string;
    name: string;
    password: string;
    birthdate?: string;
}): Promise<AuthUser> {
    return apiRequest<AuthUser>("/auth/register", {
        method: "POST",
        body: JSON.stringify(user),
    });
}