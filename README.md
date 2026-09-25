# Twoj Autobus

Backend aplikacji jest napisany we frameworku FastAPI. Na tym etapie zawiera:

- endpoint zdrowia aplikacji: `GET /health`,
- rejestracje: `POST /auth/register`,
- logowanie z tokenem JWT: `POST /auth/login`,
- lista przewoźników: `GET /transit/providers`,
- wyszukiwanie przystanków: `GET /transit/{provider_id}/stops`,
- wyszukiwanie trasy: `POST /transit/search`,
- automatyczna dokumentacje API pod `/docs`.

## Uruchomienie backendu na Windows

Otworz PowerShell w katalogu projektu i wykonaj:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Jeżeli PowerShell blokuje aktywacje środowiska, jednorazowo wykonaj:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Po uruchomieniu otworz:

- API: http://127.0.0.1:8000
- dokumentacje interaktywna: http://127.0.0.1:8000/docs
- kontrola dzialania: http://127.0.0.1:8000/health

## Konfiguracja

Ustawienia sa odczytywane ze zmiennych srodowiskowych. Przy uruchamianiu z PowerShell ustaw je tak:

```powershell
$env:JWT_SECRET = "local-development-secret"
$env:PORT = "8000"
$env:CORS_ORIGINS = "http://localhost:3000,http://localhost:5173"
```

Plik `.env` nie jest ladowany automatycznie. Przyklady zmiennych znajduja sie w `backend/.env.example`.

## Baza danych SQLite

Przy pierwszym uruchomieniu backend tworzy `backend/data/twojautobus.sqlite3`.
Importuje do niej dane trzech przewoznikow oraz konta i historie z dawnego
`backend/data/users.json`. Kolejne starty korzystaja z SQLite i nie importuja
ponownie juz zaladowanych przewoznikow.

Aby jawnie ponownie wczytac rozklady ze zrodlowych plikow JSON, zatrzymaj backend
i uruchom z katalogu `backend`:

```powershell
python -m app.database --reimport-transit
```

Ponowny import rozkladow nie usuwa kont uzytkownikow. Mozesz zmienic lokalizacje
bazy przez zmienna `DATABASE_PATH`.

## Sprawdzanie wyszukiwarki tras

Po uruchomieniu backendu wejdz na http://127.0.0.1:8000/docs.

1. Wywolaj `GET /transit/providers`, aby zobaczyc dostepnych przewoznikow:
   `mzdik_radom`, `mzk_kielce` i `ztm_lublin`.
2. Wywolaj `GET /transit/{provider_id}/stops?query=...`, aby znalezc id przystanku.
3. W `POST /transit/search` wyslij na przyklad:

```json
{
  "provider_id": "mzk_kielce",
  "from_stop": "1",
  "to_stop": "4",
  "departure_time": "05:00",
  "max_transfers": 1
}
```

Odpowiedz zawiera przewoznika, numer linii, kierunek, godzine odjazdu,
godzine przyjazdu, czas przejazdu, przystanek przesiadkowy i czas oczekiwania.
`max_transfers` moze przyjmowac `0` albo `1`.

### Wazne ograniczenie danych

Obecne pliki `rozkłady/*.json` zawieraja odjazdy przypisane do pojedynczego
przystanku, ale nie zawieraja kolejnosci wszystkich przystankow na trasie ani
czasow przyjazdu do kolejnych przystankow. Dlatego odpowiedz oznacza
`stops_complete: false` i pokazuje punkty poczatkowe/przesiadkowe/koncowe.

Silnik jest przygotowany na pelne dane trasy. Po dodaniu do kierunku pola
`przebieg` z lista przystankow i czasow, adapter przewoznika moze zwrocic
pelna liste bez zmiany kontraktu API.

## Przykladowe dane auth

Rejestracja w `/docs`:

```json
{
  "email": "nowy@example.com",
  "name": "Jan Kowalski",
  "password": "minimum-8-znakow",
  "birthdate": "2000-01-01"
}
```

Logowanie zwraca `access_token`, ktory pozniej wysyla sie jako naglowek:

```text
Authorization: Bearer <access_token>
```

## Struktura backendu

```text
backend/
|-- index.py                 # punkt wejscia aplikacji
|-- requirements.txt         # zaleznosci Pythona
|-- data/twojautobus.sqlite3 # lokalna baza uzywana podczas pracy aplikacji
`-- app/auth/
    |-- login.py             # logowanie i JWT
    |-- register.py          # rejestracja
    |-- models.py            # odczyt i zapis uzytkownikow
    |-- password.py          # bcrypt
    `-- schemas.py            # walidacja danych API
```

  Pliki przewoznikow `mapa_komunikacja.json` i `rozkłady/*.json` pozostaja zrodlowymi
  plikami importu. Aplikacja odczytuje rozklady z SQLite. Plik `users.json` jest
  uzywany tylko do jednorazowego przeniesienia istniejacych kont. Przed wdrozeniem
  ustaw silny sekret JWT poza repozytorium.