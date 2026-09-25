# Jak zacząć frontend i połączyć go z backendem

Backend jest API w FastAPI, a nie gotową stroną. Frontend można napisać osobno i
wysyłać do API żądania HTTP. W repozytorium są już katalogi `frontend/pages`,
`frontend/components` i `frontend/assets`; na początek wystarczy zwykły HTML, CSS
i JavaScript, bez dodatkowych bibliotek.

## 1. Uruchom backend

Otwórz pierwszy terminal w VS Code, w katalogu projektu:

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Jeśli środowisko wirtualne jest w `backend\.venv`, zamiast ścieżki aktywacji wyżej użyj:

```powershell
.\.venv\Scripts\Activate.ps1
```

Przy pierwszym starcie backend utworzy `backend/data/twojautobus.sqlite3` i
zaimportuje rozkłady oraz dotychczasowych użytkowników. Baza SQLite jest lokalna
i nie wymaga osobnego serwera.

Sprawdź API w przeglądarce:

- `http://127.0.0.1:8000/health` - status API
- `http://127.0.0.1:8000/docs` - dokumentacja i ręczne testy endpointów

## 2. Przygotuj pliki strony

Utwórz pliki:

```text
frontend/
|-- index.html
|-- assets/
|   |-- css/style.css
|   `-- javascript/app.js
|-- components/
`-- pages/
```

Pierwszy widok planowania podróży powinien mieć:

1. Wybór przewoźnika.
2. Pole przystanku początkowego i końcowego z podpowiedziami.
3. Godzinę odjazdu oraz przycisk wyszukiwania.
4. Wyniki pokazujące linię, kierunek, przystanki odcinka, odjazd, przyjazd,
   przesiadki i czas oczekiwania.

Do formularza używaj identyfikatorów przystanków otrzymanych z API, nie samych
nazw. W obrębie jednego miasta nazwy mogą się powtarzać.

## 3. Uruchom frontend

Otwórz drugi terminal w VS Code i uruchom prosty lokalny serwer plików:

```powershell
cd frontend
python -m http.server 5500
```

Wejdź na `http://localhost:5500`. Ten adres jest dozwolony przez domyślny CORS
backendu. Jeśli zmienisz port lub host frontendu, dodaj jego origin do
`CORS_ORIGINS` przed uruchomieniem backendu, na przykład:

```powershell
$env:CORS_ORIGINS = "http://localhost:5500,http://localhost:3000"
```

Origin to protokół, host i port strony. Nie dopisuj do niego ścieżki `/docs` ani
ukośnika z trasą API.

## 4. Kontrakty API dla planera

### Lista przewoźników

`GET http://127.0.0.1:8000/transit/providers`

Odpowiedź zawiera `id` i `name`. Przekazuj `id` wybranego przewoźnika w kolejnych
żądaniach. Aktualnie są to `mzdik_radom`, `mzk_kielce` i `ztm_lublin`.

### Podpowiedzi przystanków

`GET /transit/{provider_id}/stops?query=ogród`

Wynik zawiera `id`, `name`, `latitude` i `longitude`. Wybierz element z listy i
zachowaj jego `id` do żądania planowania.

### Wyszukanie przejazdu

`POST /transit/search` z nagłówkiem `Content-Type: application/json`:

```json
{
  "provider_id": "mzk_kielce",
  "from_stop": "1",
  "to_stop": "4",
  "departure_time": "05:00",
  "max_transfers": 1
}
```

`departure_time` ma format `HH:MM`; pominięcie go oznacza bieżącą godzinę.
`max_transfers` może być `0` albo `1`. Odpowiedź ma `routes`, a każdy wariant
zawiera listę `legs` (odcinków), `transfers`, `departure_time`, `arrival_time`
i `travel_minutes`. Na przesiadce pokazany jest przystanek i `wait_minutes`.

## 5. Minimalny kod komunikacji

W `frontend/assets/javascript/app.js` można zacząć od wspólnej funkcji do zapytań:

```javascript
const API_URL = "http://127.0.0.1:8000";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? `Błąd API: ${response.status}`);
  }

  return response.json();
}

async function loadProviders() {
  return apiRequest("/transit/providers");
}

async function searchStops(providerId, query) {
  const params = new URLSearchParams({ query });
  return apiRequest(`/transit/${encodeURIComponent(providerId)}/stops?${params}`);
}

async function searchRoutes(request) {
  return apiRequest("/transit/search", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
```

Przykładowe użycie po wybraniu dwóch przystanków:

```javascript
const result = await searchRoutes({
  provider_id: "mzk_kielce",
  from_stop: "1",
  to_stop: "4",
  departure_time: "05:00",
  max_transfers: 1,
});

console.log(result.routes);
```

Pokazuj użytkownikowi stan ładowania oraz błędy z `error.message`. Gdy `routes`
jest puste, wyświetl informację, że dla wybranych przystanków i godziny nie
znaleziono połączenia.

## 6. Rejestracja i logowanie

- Rejestracja: `POST /auth/register` z `email`, `name`, `password` i opcjonalnym
  `birthdate` w formacie `YYYY-MM-DD`.
- Logowanie: `POST /auth/login` z `email` i `password`.
- Logowanie zwraca `access_token`. Dla chronionych endpointów wysyłaj go jako
  `Authorization: Bearer <access_token>`.

Nie zapisuj hasła w przeglądarce ani nie umieszczaj sekretu JWT w kodzie
frontendu. Token można trzymać w pamięci aplikacji; trwałe przechowywanie tokenu
w `localStorage` zwiększa skutki ataku XSS.

## 7. Wskazówki i aktualne ograniczenia

- Wywołuj `/transit/providers` przy starcie widoku i buduj wybór na podstawie
  odpowiedzi, zamiast na stałe wpisywać listę przewoźników.
- Przystanki pobieraj dla aktualnie wybranego przewoźnika.
- Nazwy przystanków mogą się powtarzać; pokazuj nazwę i, gdy to pomocne,
  lokalizację, ale wysyłaj ich `id`.
- Baza SQLite jest zasilana początkowo ze źródłowych plików JSON. Po zmianie
  tych plików zatrzymaj API i z katalogu `backend` uruchom
  `python -m app.database --reimport-transit`.
- Aktualne źródłowe rozkłady nie zawierają pełnej listy przystanków na przebiegu
  linii ani czasów pośrednich. API zwraca więc `stops_complete: false` i pokazuje
  znane punkty odcinka; pełna lista wymaga uzupełnienia źródła rozkładów.

Dokumentacja operacyjna backendu i baza SQLite są opisane również w `README.md`.