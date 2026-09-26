# Twój Autobus

Aplikacja do wyszukiwania połączeń komunikacji miejskiej. Frontend działa na
Next.js z TypeScriptem, a backend udostępnia API w FastAPI. Konta użytkowników,
przystanki, linie i odjazdy przechowywane są w SQLite.

## Funkcje

- wyszukiwanie połączeń dla MZDiK Radom, MZK Kielce i ZTM Lublin,
- podpowiedzi przystanków oraz wyniki z maksymalnie jedną przesiadką,
- mapa przystanków na OpenStreetMap,
- rejestracja i logowanie z tokenem JWT,
- strony Next.js dla planera, wyników, mapy, auth i własnego 404.

## Wymagania

- Node.js 20 lub nowszy i npm,
- Python 3.10 lub nowszy,
- dostęp do internetu dla kafelków mapy OpenStreetMap.

## Uruchomienie lokalne

Uruchom backend w pierwszym terminalu:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Uruchom Next.js w drugim terminalu:

```powershell
cd frontend
npm install
npm run dev
```

Otwórz http://localhost:3000. Backend API i Swagger są dostępne pod
http://localhost:8000 oraz http://localhost:8000/docs.

Przy pierwszym uruchomieniu backend tworzy `backend/data/twojautobus.sqlite3`
i importuje do niej rozkłady oraz istniejące konta z `backend/data/users.json`.

Jeśli PowerShell blokuje aktywację środowiska wirtualnego, jednorazowo wykonaj:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Konfiguracja

Opcjonalnie skopiuj `frontend/.env.local.example` jako `frontend/.env.local`.
Możesz tam ustawić adres API:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Przed wdrożeniem ustaw silny sekret JWT w środowisku backendu. Zmienne
`DATABASE_PATH`, `JWT_SECRET`, `PORT` i `CORS_ORIGINS` opisane są w
[write.md](write.md).

## API

- `GET /transit/providers` - lista przewoźników,
- `GET /transit/{provider_id}/stops?query=...` - wyszukiwanie przystanków,
- `POST /transit/search` - wyszukanie połączenia,
- `POST /auth/register` - rejestracja,
- `POST /auth/login` - logowanie,
- `GET /health` - status backendu.

Przykładowe żądanie `POST /transit/search`:

```json
{
  "provider_id": "mzk_kielce",
  "from_stop": "1",
  "to_stop": "4",
  "departure_time": "05:00",
  "max_transfers": 1
}
```

## Ograniczenie danych

Źródłowe rozkłady nie zawierają pełnej kolejności przystanków na trasie ani
czasów pośrednich. Warianty mogą zatem zawierać `stops_complete: false`. Pełny
przebieg wymaga dokładniejszych danych, np. GTFS.

Informacje o architekturze i pracy developerskiej znajdują się w
[write.md](write.md).