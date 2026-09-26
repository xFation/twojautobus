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
|-- home.html
|-- assets/
|   |-- css/simple.css
|   `-- javascript/
|       |-- api.js
|       `-- home.js
|-- components/
`-- pages/
  |-- wyniki.html
  |-- map.html
  |-- login.html
  `-- register.html
```

Strona startowa ma już formularz planowania podróży z:

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
|-- 404.html                   # wejściowa strona błędu dla hostingu statycznego
```
|-- components/
|   |-- header.html            # wspólna nawigacja
|   `-- footer.html            # wspólna stopka

Wejdź na `http://localhost:5500`. Ten adres jest dozwolony przez domyślny CORS
backendu. Jeśli zmienisz port lub host frontendu, dodaj jego origin do
`CORS_ORIGINS` przed uruchomieniem backendu, na przykład:
|   |-- register.html          # rejestracja
|   `-- 404.html               # właściwa treść błędu 404
```powershell
  |-- css/base.css           # globalne kolory, reset i typografia
  |-- css/simple.css         # proste style układu stron
  |-- css/home.css           # style strony startowej
  |-- css/404.css            # style strony błędu
```

    |-- layout.js          # wczytywanie header.html i footer.html
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

## 5. Wspólny kod komunikacji

Wspólna funkcja żądań znajduje się w `frontend/assets/javascript/api.js`. Logika
poszczególnych stron jest w ich własnych plikach JavaScript, na przykład
`home.js`, `results.js`, `map.js`, `login.js` i `register.js`.

Przykładowa funkcja komunikacji:

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

## Aktualne strony frontendu

Frontend korzysta ze zwykłego HTML, CSS i JavaScriptu. Nie używa frameworka.

```text
frontend/
|-- index.html                 # przekierowanie do strony startowej
|-- home.html                  # wybór przewoźnika i przystanków
|-- pages/
|   |-- wyniki.html            # wyniki wyszukiwania
|   |-- map.html               # OpenStreetMap i przystanki przewoźnika
|   |-- login.html             # logowanie
|   `-- register.html          # rejestracja
`-- assets/
    |-- css/simple.css         # podstawowe style do własnej rozbudowy
    `-- javascript/
        |-- api.js             # wspólne żądania HTTP do backendu
        |-- home.js            # logika strony startowej
        |-- results.js         # pobranie i wyświetlanie wyników
        |-- map.js             # markery przystanków na mapie
        |-- login.js           # formularz logowania
        `-- register.js        # formularz rejestracji
```

Każda podstrona ma swój plik JavaScript. Wspólne `api.js` tylko udostępnia
funkcję `window.apiRequest`. Jeśli backend działa na innym porcie, zmień
`API_BASE_URL` w tym pliku.

## Wspólny header i footer bez PHP

`include` w PHP działa po stronie serwera. Zwykłe pliki `.html` nie wykonują PHP,
więc zapis `<?php include ... ?>` w HTML zostanie pokazany jako tekst albo
zignorowany. Tutaj te same fragmenty są wczytywane przez JavaScript:

```html
<div data-site-header></div>
<!-- treść strony -->
<div data-site-footer></div>

<script src="../assets/javascript/layout.js" data-root="../" data-page="map" defer></script>
```

Na stronie `home.html` ustaw `data-root=""` albo `data-root="./"`, bo leży w
katalogu głównym. Na stronach w `pages/` ustaw `data-root="../"`. Atrybut
`data-page` wskazuje aktywny link menu. `layout.js` pobiera `components/header.html`
i `components/footer.html`, wstawia je w placeholdery i dopasowuje ścieżki.

Edytuj `frontend/components/header.html`, aby zmienić wspólne menu, albo
`frontend/components/footer.html`, aby zmienić wspólną stopkę. Zmiana pojawi się
na wszystkich stronach po ich odświeżeniu. Ponieważ fragmenty są ładowane przez
`fetch`, stronę otwieraj przez Live Server, a nie jako plik `file://`.

Strona 404 jest w `frontend/pages/404.html`, a `frontend/404.html` jest plikiem
wejściowym rozpoznawanym przez popularne statyczne hostingi. W panelu hostingu
ustaw `pages/404.html` jako własną stronę 404, jeśli hosting pozwala wskazać
ścieżkę. Dla produkcyjnego serwera można też ustawić jego konfigurację błędu 404.

Mapa korzysta z biblioteki Leaflet przez CDN i kafelków OpenStreetMap. Sam
formularz, nawigacja i pozostałe skrypty są zwykłym JavaScriptem.

## Automatyczne odświeżanie podczas pracy

Najprostszy sposób w VS Code:

1. Otwórz Extensions przez `Ctrl+Shift+X` i zainstaluj **Live Server**.
2. Otwórz `frontend/home.html`, kliknij prawym przyciskiem i wybierz **Open with Live Server**. Możesz też kliknąć **Go Live** na pasku stanu.
3. Przeciągnij otwartą kartę przeglądarki na drugi monitor.
4. Zapisuj plik przez `Ctrl+S`; Live Server sam odświeży stronę po zapisaniu.

Jeśli chcesz, aby VS Code zapisywał zmiany automatycznie, w ustawieniach
wyszukaj `Auto Save` i wybierz `afterDelay`. Możesz też dodać do ustawień VS Code:

```json
{
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000
}
```

Live Server i backend muszą działać równocześnie w dwóch terminalach. Wcześniej
uruchomiony `python -m http.server` nie odświeża automatycznie strony po każdej
zmianie; do pracy na żywo użyj Live Server.

Dokumentacja operacyjna backendu i baza SQLite są opisane również w `README.md`.