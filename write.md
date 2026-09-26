# Dokumentacja developerska

## Struktura repozytorium

```text
backend/
|-- index.py                   # FastAPI, serwowanie stron i własny fallback 404
|-- requirements.txt
|-- app/
|   |-- database.py            # SQLite, migracja i import danych
|   |-- auth/                  # rejestracja i logowanie JWT
|   `-- transit/               # API przewoźników, przystanków i tras
`-- data/
    |-- twojautobus.sqlite3    # lokalna baza tworzona automatycznie
    |-- users.json             # źródło jednorazowego importu kont
    `-- <provider>/            # źródłowe mapy i rozkłady JSON

frontend/
|-- components/
|   |-- header.html            # wspólna nawigacja
|   `-- footer.html            # wspólna stopka
|-- pages/
|   |-- home.html              # strona startowa
|   |-- wyniki.html            # wyniki planowania
|   |-- map.html               # przystanki na OpenStreetMap
|   |-- login.html
|   |-- register.html
|   `-- 404.html               # strona nieznanego adresu
`-- assets/
    |-- css/                   # wspólne i lokalne style
    `-- javascript/            # api.js, layout.js i logika stron
```

Nie ma `index.html`. FastAPI przekierowuje `/` bezpośrednio do
`/pages/home.html`. Alias `/home.html` również prowadzi do tej strony.

## Uruchamianie developerskie

Z katalogu projektu:

```powershell
cd backend
..\.venv\Scripts\Activate.ps1
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Jeśli środowisko jest w `backend\.venv`, aktywuj je poleceniem
`\.venv\Scripts\Activate.ps1` po wejściu do `backend`.

Backend serwuje HTML, assets i components, więc testuj routing 404 przez
`http://127.0.0.1:8000`, nie przez `python -m http.server`. Do automatycznego
odświeżania edytowanego HTML/CSS/JS można użyć rozszerzenia VS Code Live Server na
porcie 5500. W takim trybie API nadal działa na 8000, a adres 5500 jest dozwolony
w domyślnym CORS.

## Routing frontend/backend

W `backend/index.py` obowiązuje następująca kolejność:

1. routery API `/auth` i `/transit`,
2. montowanie `/assets` oraz `/components`,
3. przekierowania `/` i `/home.html`,
4. endpoint `/health`,
5. catch-all `/{requested_path:path}` na końcu.

Catch-all szuka dozwolonego pliku HTML w `frontend/pages`. Jeśli go nie ma,
zwraca `frontend/pages/404.html` ze statusem HTTP 404. Nie przenoś tej trasy
przed routery API ani mounty statycznych katalogów. Nieznane ścieżki API `/auth`,
`/transit` i `/health` dostają JSON 404, a nieznane ścieżki strony dostają HTML.

Nową stronę dodaje się do `frontend/pages`, np. `kontakt.html`. Jej URL to
`/pages/kontakt.html`. Warto dodać odnośnik w `frontend/components/header.html`.
Wpisanie nieistniejącego `/pages/nazwa.html` pokaże stronę 404.

## Wspólny header i footer

Statyczne HTML nie wykonuje PHP `include`. W każdej stronie umieszczamy:

```html
<div data-site-header></div>
<main><!-- zawartość strony --></main>
<div data-site-footer></div>
<script src="../assets/javascript/layout.js"
        data-asset-root="../"
        data-link-root=""
        data-page="map"
        defer></script>
```

`layout.js` pobiera fragmenty z `/components/header.html` i
`/components/footer.html`. Wszystkie strony są w tym samym katalogu, więc
`data-asset-root="../"` wskazuje katalog `frontend`, a `data-link-root=""`
oznacza, że odnośniki w komponencie są względem bieżącego katalogu `pages`.
`data-page` zaznacza aktywną pozycję nawigacji.

Edytuj `components/header.html` lub `components/footer.html`, aby zmienić je na
wszystkich stronach. Loader korzysta z `fetch`, dlatego nie otwieraj stron przez
`file://`.

## API

- `GET /transit/providers` - dostępni przewoźnicy,
- `GET /transit/{provider_id}/stops?query=...` - wyszukiwanie przystanków,
- `POST /transit/search` - plan podróży z 0 lub 1 przesiadką,
- `POST /auth/register` - rejestracja,
- `POST /auth/login` - logowanie i JWT,
- `GET /health` - status aplikacji,
- `GET /docs` - Swagger UI.

Wspólny wrapper `window.apiRequest` znajduje się w
`frontend/assets/javascript/api.js`. Logika stron jest rozdzielona na
`home.js`, `results.js`, `map.js`, `login.js`, `register.js` oraz `404.js`.

## SQLite i import danych

`app/database.py` jest jedyną warstwą dostępu do SQLite. Baza inicjalizuje się
przy starcie FastAPI. Import przewoźnika następuje raz, gdy jego ID nie istnieje
w tabeli `providers`. Istniejące konta i historię z `data/users.json` importer
przenosi do tabel `users` i `recent_routes`.

Po aktualizacji źródłowych JSON-ów zatrzymaj serwer, a w katalogu `backend`
wykonaj:

```powershell
python -m app.database --reimport-transit
```

To polecenie ponownie importuje dane przewoźników, ale nie usuwa kont. Ścieżkę
bazy można ustawić zmienną `DATABASE_PATH`.

## Dodawanie przewoźnika

Dodaj katalog w `backend/data/<id>/` zawierający `mapa_komunikacja.json` oraz
`rozkłady/`. Importer automatycznie odkrywa taki katalog. Nazwy trzech aktualnych
przewoźników są jawnie określone w `KNOWN_PROVIDER_NAMES` w `app/database.py`;
dla nowego operatora dodaj tam czytelną nazwę, a następnie uruchom import.

## Testy i sprawdzenia

Kompilacja składni backendu z katalogu repozytorium:

```powershell
python -m compileall -q backend
```

Po uruchomieniu backendu sprawdź:

- `/` przekierowuje do `/pages/home.html`,
- `/pages/home.html` zwraca 200,
- `/pages/nie-ma-takiej-strony.html` zwraca HTML 404 i status 404,
- `/assets/css/base.css` oraz `/components/header.html` zwracają 200,
- `/transit/providers` zwraca trzech przewoźników,
- `/docs` zawiera endpointy auth i transit.

Do przeglądarkowego smoke testu można skorzystać z formularzy w `/docs` albo
otworzyć frontend na backendzie i wykonać plan trasy z wyborem przystanków.

## Ograniczenia danych

Rozkłady zawierają odjazdy na poszczególnych przystankach, ale nie kompletny
przebieg każdej linii. API może więc zwracać `stops_complete: false`. Nie należy
prezentować krótkiej listy punktów odcinka jako pełnej listy przystanków. Pełne
trasy wymagają źródła zawierającego kolejność przystanków i czasy pośrednie, np.
GTFS.