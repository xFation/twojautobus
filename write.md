# Dokumentacja developerska

## Układ projektu

```text
backend/
|-- index.py                    # FastAPI: API i przekierowanie root do Next
|-- requirements.txt
|-- app/
|   |-- database.py             # SQLite, schemat i import danych
|   |-- auth/                   # rejestracja i logowanie JWT
|   `-- transit/                # przewoźnicy, przystanki, planner
`-- data/
    |-- twojautobus.sqlite3     # lokalna baza (generowana)
    |-- users.json              # źródło jednorazowego importu starych kont
    `-- <provider>/             # źródłowe mapy i rozkłady JSON

frontend/
|-- pages/                      # Next.js Pages Router; pliki routingu są TSX
|   |-- _app.tsx                # wspólny Header, Footer i globalne CSS
|   |-- _document.tsx           # lang="pl"
|   |-- index.tsx               # /, planer podróży
|   |-- home.tsx                # /home, alias strony startowej
|   |-- wyniki.tsx              # /wyniki
|   |-- map.tsx                 # /map
|   |-- login.tsx               # /login
|   |-- register.tsx            # /register
|   `-- 404.tsx                 # własna strona nieznanych adresów
|-- components/                 # współdzielone komponenty React/TSX
|-- lib/api.ts                  # typowany klient FastAPI
|-- types.ts                    # typy kontraktów API
|-- assets/css/                 # globalne i specyficzne arkusze CSS
|-- package.json
|-- tsconfig.json
`-- next.config.ts
```

Strony i komponenty widoku zapisujemy jako `.tsx`. Pliki bez JSX używają
rozszerzenia `.ts`, style pozostają w `.css`, a konfiguracja i zależności w
standardowych plikach Next/npm.

## Uruchamianie developerskie

Backend, terminal 1:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Frontend, terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Next działa pod http://localhost:3000, FastAPI pod http://localhost:8000. API
domyślnie dopuszcza origin `http://localhost:3000`. `NEXT_PUBLIC_API_URL` może
nadpisać URL API; lokalny przykład znajduje się w `.env.local.example`.

Zmienne backendu ustaw w środowisku procesu (FastAPI nie ładuje automatycznie
pliku `.env`):

- `JWT_SECRET` - wymagany poza lokalnym prototypem, losowy sekret o długości co
    najmniej 32 znaków,
- `DATABASE_PATH` - opcjonalna ścieżka SQLite; domyślnie
    `backend/data/twojautobus.sqlite3`,
- `PORT` - port FastAPI, domyślnie `8000`,
- `FRONTEND_URL` - adres przekierowania backendowego `/`, domyślnie
    `http://localhost:3000`,
- `CORS_ORIGINS` - lista originów rozdzielona przecinkami; domyślna konfiguracja
    dopuszcza localhost i 127.0.0.1 na portach developerskich.

## Routing Next.js i 404

To projekt Pages Router. Folder `pages/` definiuje trasy URL, ale nie jest
częścią URL: `pages/map.tsx` obsługuje `/map`, a `pages/index.tsx` obsługuje `/`.
Nie dodawaj `index.html` ani ręcznego catch-all HTML do FastAPI.

Nieznane ścieżki Next obsługuje `pages/404.tsx`. FastAPI jest osobną usługą API;
nieznana trasa API zwraca JSON 404. `/` na porcie backendu przekierowuje do
`FRONTEND_URL` (domyślnie `http://localhost:3000`), a `/docs` pozostaje Swagger UI.

Dodawanie strony:

1. Utwórz `frontend/pages/nazwa.tsx` i wyeksportuj komponent React jako default.
2. Dodaj link do `components/Header.tsx`, jeśli strona ma być w menu.
3. Dodaj style do istniejącego arkusza albo do osobnego CSS importowanego przez
   `pages/_app.tsx`.

Wspólny nagłówek i stopka są komponentami `components/Header.tsx` i
`components/Footer.tsx`, renderowanymi przez `_app.tsx`.

## Integracja z API

Wszystkie żądania idą przez `lib/api.ts`. Funkcje dostępne dla UI:

- `getProviders()` - wybór przewoźnika,
- `searchStops(providerId, query)` - podpowiedzi przystanków,
- `getProviderStops(providerId)` - wszystkie przystanki do mapy,
- `searchRoutes(request)` - planer,
- `login(email, password)` i `registerUser(user)` - auth.

Typy odpowiedzi i żądań są w `types.ts`. Nie duplikuj kształtu JSON w komponentach.
Logikę stanową i `fetch` wykonuj w komponentach client-side (`useEffect`, obsługa
formularza); komponenty prezentacyjne przyjmują typowane props.

Token JWT jest przechowywany w `sessionStorage` w tej implementacji logowania.
Nie umieszczaj sekretu JWT backendu w zmiennych `NEXT_PUBLIC_*`.

## Mapa

Mapa korzysta z Leaflet i kafelków OpenStreetMap. Leaflet jest importowany
dynamicznie wewnątrz `useEffect` komponentu `components/StopsMap.tsx`, ponieważ
próba importu obiektu mapy podczas SSR odwołałaby się do `window`. Arkusz
`leaflet/dist/leaflet.css` jest załadowany globalnie w `pages/_app.tsx`.

Przypisanie innego przewoźnika pobiera jego listę przystanków z API, czyści starą
warstwę markerów i dopasowuje mapę do nowych współrzędnych.

## SQLite i import przewoźników

`backend/app/database.py` jest jedyną warstwą dostępu do SQLite. Baza tworzy się
automatycznie przy starcie backendu. Istniejące konta i historię z `users.json`
importuje do tabel użytkowników, a dane przewoźników do tabel providers/stops/
lines/departures.

Po zmianie źródłowych JSON-ów zatrzymaj backend i w katalogu `backend` wykonaj:

```powershell
python -m app.database --reimport-transit
```

Nowy operator: dodaj katalog `backend/data/<id>/` z `mapa_komunikacja.json` i
`rozkłady/`. Importer wykryje katalog. Dla czytelnej nazwy dodaj wpis do
`KNOWN_PROVIDER_NAMES` w `app/database.py`, po czym uruchom reimport.

Lokalną ścieżkę bazy można ustawić zmienną `DATABASE_PATH`. Nie commituj pliku
SQLite, sekretów ani `.env.local`.

## Sprawdzenia

Po instalacji Node dependencies uruchom w `frontend`:

```powershell
npm run typecheck
npm run build
```

W `backend`:

```powershell
python -m compileall -q .
```

Smoke test w przeglądarce: planer pobiera przewoźników, wybiera przystanki i
przechodzi do `/wyniki`; mapa ładuje markery po zmianie przewoźnika; login i
register pokazują odpowiedzi API; błędna ścieżka Next pokazuje custom 404.

## Znane ograniczenia

Źródłowe rozkłady nie mają kompletnego przebiegu każdej linii ani czasów
pośrednich. Planner może zwrócić `stops_complete: false`; nie przedstawiaj listy
punktów start/przesiadka/koniec jako pełnego przebiegu.