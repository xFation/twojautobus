// Zmień adres, jeśli backend działa na innym komputerze lub porcie.
window.API_BASE_URL = "http://127.0.0.1:8000";

window.apiRequest = async function apiRequest(path, options = {}) {
    let response;
    try {
        response = await fetch(`${window.API_BASE_URL}${path}`, {
            ...options,
            headers: { "Content-Type": "application/json", ...options.headers },
        });
    } catch {
        throw new Error("Brak połączenia z API. Sprawdź, czy backend działa na porcie 8000.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Błąd API: ${response.status}`);
    return data;
};