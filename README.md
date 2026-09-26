# Twój Autobus

Aplikacja do wyszukiwania połączeń komunikacji miejskiej. Frontend jest napisany
w zwykłym HTML, CSS i JavaScripcie, a backend udostępnia API w FastAPI. Dane
użytkowników, przystanków, linii i odjazdów są przechowywane w SQLite.

## Funkcje

- wybór jednego z przewoźników: MZDiK Radom, MZK Kielce i ZTM Lublin,
- podpowiedzi przystanków i wyszukiwanie połączeń z maksymalnie jedną przesiadką,
- mapa przystanków na OpenStreetMap,
- rejestracja i logowanie z tokenem JWT,
- wspólny header i footer HTML oraz własna strona 404.

## Wymagania

- Python 3.10 lub nowszy,
- przeglądarka z dostępem do sieci, potrzebnym do kafelków OpenStreetMap.

## Uruchomienie

W PowerShell, z katalogu głównego projektu:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Otwórz stronę główną pod adresem:

- http://127.0.0.1:8000/ - przekierowanie do strony startowej,
- http://127.0.0.1:8000/pages/home.html - strona startowa,
- http://127.0.0.1:8000/docs - dokumentacja i testowanie API,
- http://127.0.0.1:8000/health - kontrola działania backendu.

Przy pierwszym uruchomieniu aplikacja utworzy `backend/data/twojautobus.sqlite3`
i zaimportuje dane źródłowe oraz istniejące konta z `users.json`.

Jeśli PowerShell blokuje aktywowanie środowiska wirtualnego, wykonaj jednorazowo:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Konfiguracja

Ustaw sekret JWT przed uruchomieniem backendu. Wartość poniżej jest przykładowa;
do wdrożenia użyj własnego, losowego sekretu:

```powershell
$env:JWT_SECRET = "replace-with-a-long-random-secret"
$env:DATABASE_PATH = "C:\data\twojautobus.sqlite3"
python -m uvicorn index:app --reload --host 127.0.0.1 --port 8000
```

Domyślna baza znajduje się w `backend/data/twojautobus.sqlite3`. Domyślne strony
są serwowane przez FastAPI z tego samego adresu co API, więc osobna konfiguracja
CORS nie jest wymagana przy zwykłym uruchomieniu.

## Przykład wyszukiwania

`POST /transit/search`:

```json
{
  "provider_id": "mzk_kielce",
  "from_stop": "1",
  "to_stop": "4",
  "departure_time": "05:00",
  "max_transfers": 1
}
```

Najpierw można pobrać przewoźników przez `GET /transit/providers`, a przystanki
przewoźnika przez `GET /transit/{provider_id}/stops?query=...`.

## Ważne ograniczenie danych

Źródłowe rozkłady zawierają odjazdy na przystankach, ale nie pełną kolejność
przystanków i czasy pośrednie. Wyszukiwarka zwraca dostępne warianty i przesiadki,
ale wynik może mieć `stops_complete: false`. Pełny przebieg wymaga dokładniejszych
danych tras, na przykład GTFS.

Szczegóły architektury, routingu stron i pracy nad kodem znajdują się w
[write.md](write.md).