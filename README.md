# Twój Autobus

Twój Autobus to planer połączeń komunikacji miejskiej dla Radomia, Kielc i
Lublina. Aplikacja łączy frontend Next.js z API FastAPI, a dane użytkowników i
rozkładów przechowuje w lokalnej bazie SQLite.

## Funkcje

- wyszukiwanie połączeń z maksymalnie jedną przesiadką,
- podpowiadanie przystanków podczas wpisywania,
- mapa przystanków oparta na Leaflet i OpenStreetMap,
- rejestracja i logowanie użytkowników,
- obsługa danych MZDiK Radom, MZK Kielce i ZTM Lublin.

## Technologie

- Frontend: Next.js 15, React 19 i TypeScript.
- Backend: Python, FastAPI i SQLite.
- Mapa: Leaflet i kafelki OpenStreetMap.

## Wymagania

- Node.js 20.9 lub nowszy oraz npm,
- Python 3.10 lub nowszy,
- połączenie z internetem do pobierania kafelków mapy.

## Uruchomienie lokalne

W pierwszym terminalu przygotuj i uruchom backend:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

W drugim terminalu uruchom frontend:

```powershell
cd frontend
npm install
npm run dev
```

Aplikacja działa pod adresem http://localhost:3000. API jest dostępne pod
http://localhost:8000, a dokumentacja Swagger pod http://localhost:8000/docs.
Przy pierwszym uruchomieniu backend inicjalizuje bazę i importuje dane źródłowe.

Jeśli PowerShell blokuje aktywację środowiska wirtualnego, wykonaj jednorazowo:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Konfiguracja

Skopiuj `frontend/.env.local.example` do `frontend/.env.local`, aby ustawić adres
API używany przez frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend odczytuje konfigurację ze zmiennych środowiskowych:

| Zmienna | Znaczenie | Wartość domyślna |
| --- | --- | --- |
| `JWT_SECRET` | Sekret używany do podpisywania tokenów. Ustaw własny przed wdrożeniem. | wartość developerska |
| `DATABASE_PATH` | Ścieżka do pliku bazy SQLite. | `backend/data/twojautobus.sqlite3` |
| `PORT` | Port serwera API. | `8000` |
| `FRONTEND_URL` | Adres frontendu używany przy przekierowaniu z `/`. | `http://localhost:3000` |
| `CORS_ORIGINS` | Dozwolone originy, oddzielone przecinkami. | adresy localhost |

FastAPI nie wczytuje automatycznie pliku `.env`. Nie umieszczaj sekretu JWT w
zmiennych `NEXT_PUBLIC_*` ani w repozytorium.

## API

| Metoda | Endpoint | Opis |
| --- | --- | --- |
| `GET` | `/health` | Status API |
| `GET` | `/transit/providers` | Lista przewoźników |
| `GET` | `/transit/{provider_id}/stops?query=...` | Wyszukiwanie przystanków |
| `POST` | `/transit/search` | Wyszukiwanie połączeń |
| `POST` | `/auth/register` | Rejestracja |
| `POST` | `/auth/login` | Logowanie |

## Dane rozkładowe

Pliki źródłowe znajdują się w `backend/data/`. Po ich zmianie zatrzymaj backend,
a następnie uruchom w katalogu `backend`:

```powershell
python -m app.database --reimport-transit
```

Dostępne dane nie zawsze zawierają pełną kolejność przystanków i czasy
pośrednie. W takich przypadkach API może zwrócić `stops_complete: false`.

## Struktura projektu

```text
backend/
  app/                 Logika API, autoryzacja, SQLite i transport
  data/                Źródłowe mapy i rozkłady
  index.py              Aplikacja FastAPI
frontend/
  pages/                Strony Next.js i routing
  components/           Współdzielone komponenty
  lib/                  Klient API
  public/css/           Arkusze stylów serwowane przez frontend
```

## Sprawdzenia

W katalogu `frontend`:

```powershell
npm run typecheck
npm run build
```

W katalogu `backend`:

```powershell
python -m compileall -q .
```