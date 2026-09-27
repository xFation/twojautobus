import argparse
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DEFAULT_DATABASE_PATH = DATA_DIR / "twojautobus.sqlite3"
LEGACY_USERS_FILE = DATA_DIR / "users.json"

KNOWN_PROVIDER_NAMES = {
	"mzdik_radom": "MZDiK Radom",
	"mzk_kielce": "MZK Kielce",
	"ztm_lublin": "ZTM Lublin",
}


def get_database_path() -> Path:
	configured_path = os.getenv("DATABASE_PATH")
	if configured_path:
		return Path(configured_path).expanduser().resolve()
	return DEFAULT_DATABASE_PATH


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
	"""Open a configured SQLite connection and commit or roll back its work."""
	database_path = get_database_path()
	database_path.parent.mkdir(parents=True, exist_ok=True)
	connection = sqlite3.connect(database_path, timeout=30)
	connection.row_factory = sqlite3.Row
	connection.execute("PRAGMA foreign_keys = ON")
	connection.execute("PRAGMA busy_timeout = 30000")
	try:
		yield connection
		connection.commit()
	except Exception:
		connection.rollback()
		raise
	finally:
		connection.close()


def _create_schema(connection: sqlite3.Connection) -> None:
	connection.executescript(
		"""
		PRAGMA journal_mode = WAL;

		CREATE TABLE IF NOT EXISTS database_metadata (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS providers (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			data_directory TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS stops (
			provider_id TEXT NOT NULL,
			id TEXT NOT NULL,
			name TEXT NOT NULL,
			latitude REAL NOT NULL,
			longitude REAL NOT NULL,
			PRIMARY KEY (provider_id, id),
			FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS lines (
			provider_id TEXT NOT NULL,
			id TEXT NOT NULL,
			PRIMARY KEY (provider_id, id),
			FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS departures (
			id INTEGER PRIMARY KEY,
			provider_id TEXT NOT NULL,
			stop_id TEXT NOT NULL,
			line_id TEXT NOT NULL,
			direction TEXT NOT NULL,
			departure_minutes INTEGER NOT NULL,
			FOREIGN KEY (provider_id, stop_id) REFERENCES stops(provider_id, id) ON DELETE CASCADE,
			FOREIGN KEY (provider_id, line_id) REFERENCES lines(provider_id, id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_stops_name
			ON stops(provider_id, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_departures_stop_time
			ON departures(provider_id, stop_id, departure_minutes);
		CREATE INDEX IF NOT EXISTS idx_departures_line_time
			ON departures(provider_id, line_id, stop_id, departure_minutes);

		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY,
			email TEXT NOT NULL UNIQUE COLLATE NOCASE,
			name TEXT NOT NULL,
			birthdate TEXT NOT NULL DEFAULT '',
			password_hash TEXT NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS recent_routes (
			id INTEGER PRIMARY KEY,
			user_id INTEGER NOT NULL,
			from_id TEXT NOT NULL,
			from_name TEXT NOT NULL,
			to_id TEXT NOT NULL,
			to_name TEXT NOT NULL,
			searched_at TEXT NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		);
		"""
	)


def _minutes(value: str) -> int:
	hours, minutes = (int(part) for part in value.split(":", 1))
	return hours * 60 + minutes


def _discover_provider_directories() -> list[Path]:
	return sorted(
		directory
		for directory in DATA_DIR.iterdir()
		if directory.is_dir()
		and (directory / "mapa_komunikacja.json").is_file()
		and (directory / "rozkłady").is_dir()
	)


def _import_provider(connection: sqlite3.Connection, directory: Path) -> None:
	provider_id = directory.name
	provider_name = KNOWN_PROVIDER_NAMES.get(provider_id, provider_id.replace("_", " ").title())
	with (directory / "mapa_komunikacja.json").open("r", encoding="utf-8") as file:
		map_data = json.load(file)

	connection.execute(
		"INSERT INTO providers (id, name, data_directory) VALUES (?, ?, ?)",
		(provider_id, provider_name, directory.name),
	)
	connection.executemany(
		"INSERT INTO stops (provider_id, id, name, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
		[
			(provider_id, str(stop["id"]), stop["nazwa"], float(stop["lat"]), float(stop["lon"]))
			for stop in map_data.get("przystanki", [])
		],
	)

	line_rows: set[tuple[str, str]] = set()
	departure_rows: list[tuple[str, str, str, str, int]] = []
	schedules_directory = directory / "rozkłady"
	known_stop_ids = {str(stop["id"]) for stop in map_data.get("przystanki", [])}
	for schedule_file in schedules_directory.glob("*.json"):
		stop_id = schedule_file.stem
		if stop_id not in known_stop_ids:
			continue
		with schedule_file.open("r", encoding="utf-8") as file:
			schedule = json.load(file)
		lines = schedule.get("linie", schedule.get("linia", []))
		if isinstance(lines, dict):
			lines = [lines]
		for line in lines:
			line_id = str(line.get("linia", ""))
			if not line_id:
				continue
			line_rows.add((provider_id, line_id))
			for direction in line.get("kierunki", []):
				direction_name = str(direction.get("kierunek", "Kierunek nieznany"))
				for departure in direction.get("odjazdy", []):
					departure_rows.append(
						(provider_id, stop_id, line_id, direction_name, _minutes(departure))
					)

	connection.executemany("INSERT INTO lines (provider_id, id) VALUES (?, ?)", sorted(line_rows))
	connection.executemany(
		"""
		INSERT INTO departures (provider_id, stop_id, line_id, direction, departure_minutes)
		VALUES (?, ?, ?, ?, ?)
		""",
		departure_rows,
	)


def _import_legacy_users(connection: sqlite3.Connection) -> None:
	if not LEGACY_USERS_FILE.is_file():
		return
	with LEGACY_USERS_FILE.open("r", encoding="utf-8") as file:
		users = json.load(file).get("users", [])

	for user in users:
		connection.execute(
			"""
			INSERT OR IGNORE INTO users (id, email, name, birthdate, password_hash, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
			""",
			(
				user["id"],
				user["email"],
				user.get("name", ""),
				user.get("birthdate", ""),
				user["password"],
				user.get("created_at", ""),
			),
		)
		for route in user.get("recent_routes", []):
			connection.execute(
				"""
				INSERT INTO recent_routes (user_id, from_id, from_name, to_id, to_name, searched_at)
				SELECT ?, ?, ?, ?, ?, ?
				WHERE NOT EXISTS (
					SELECT 1 FROM recent_routes
					WHERE user_id = ? AND from_id = ? AND to_id = ? AND searched_at = ?
				)
				""",
				(
					user["id"],
					str(route.get("from_id", "")),
					route.get("from_name", ""),
					str(route.get("to_id", "")),
					route.get("to_name", ""),
					route.get("searched_at", ""),
					user["id"],
					str(route.get("from_id", "")),
					str(route.get("to_id", "")),
					route.get("searched_at", ""),
				),
			)


def initialize_database(reimport_transit: bool = False) -> None:
	"""Create the schema, import legacy accounts, and seed provider data once."""
	with get_connection() as connection:
		_create_schema(connection)
		_import_legacy_users(connection)
		for directory in _discover_provider_directories():
			provider_exists = connection.execute(
				"SELECT 1 FROM providers WHERE id = ?", (directory.name,)
			).fetchone()
			if reimport_transit and provider_exists:
				connection.execute("DELETE FROM providers WHERE id = ?", (directory.name,))
				provider_exists = None
			if not provider_exists:
				_import_provider(connection, directory)


def get_providers() -> list[dict[str, Any]]:
	with get_connection() as connection:
		rows = connection.execute(
			"""
			SELECT providers.id, providers.name,
				   COUNT(DISTINCT stops.id) AS stops_count,
				   COUNT(DISTINCT lines.id) AS lines_count
			FROM providers
			LEFT JOIN stops ON stops.provider_id = providers.id
			LEFT JOIN lines ON lines.provider_id = providers.id
			GROUP BY providers.id, providers.name
			ORDER BY providers.name
			"""
		).fetchall()
		return [dict(row) for row in rows]


def get_provider(provider_id: str) -> dict[str, Any] | None:
	with get_connection() as connection:
		row = connection.execute("SELECT id, name FROM providers WHERE id = ?", (provider_id,)).fetchone()
		return dict(row) if row else None


def get_stops(provider_id: str, query: str | None = None) -> list[dict[str, Any]]:
	sql = "SELECT id, name, latitude, longitude FROM stops WHERE provider_id = ?"
	parameters: list[Any] = [provider_id]
	if query:
		sql += " AND (id = ? OR name LIKE ? COLLATE NOCASE)"
		parameters.extend((query.strip(), f"%{query.strip()}%"))
	sql += " ORDER BY name COLLATE NOCASE, id"
	with get_connection() as connection:
		return [dict(row) for row in connection.execute(sql, parameters).fetchall()]


def get_stop_suggestions(provider_id: str, query: str) -> list[dict[str, Any]]:
	"""Return one suggestion per stop name, keeping every matching stop ID."""
	with get_connection() as connection:
		rows = connection.execute(
			"""
			SELECT stops.id, stops.name, stops.latitude, stops.longitude,
			       COUNT(DISTINCT departures.line_id) AS line_count,
			       COUNT(departures.id) AS departure_count
			FROM stops
			LEFT JOIN departures
			  ON departures.provider_id = stops.provider_id
			 AND departures.stop_id = stops.id
			WHERE stops.provider_id = ?
			  AND (stops.id = ? OR stops.name LIKE ? COLLATE NOCASE)
			GROUP BY stops.provider_id, stops.id, stops.name, stops.latitude, stops.longitude
			ORDER BY stops.name COLLATE NOCASE, stops.id
			""",
			(provider_id, query.strip(), f"%{query.strip()}%"),
		).fetchall()

	groups: dict[str, list[dict[str, Any]]] = {}
	for row in rows:
		stop = dict(row)
		groups.setdefault(stop["name"].strip().casefold(), []).append(stop)

	suggestions = []
	for matching_stops in groups.values():
		preferred_stop = max(
			matching_stops,
			key=lambda stop: (stop["line_count"], stop["departure_count"], stop["id"]),
		)
		suggestions.append(
			{
				"id": preferred_stop["id"],
				"name": preferred_stop["name"],
				"latitude": preferred_stop["latitude"],
				"longitude": preferred_stop["longitude"],
				"aliases": [stop["id"] for stop in matching_stops],
			}
		)

	return sorted(suggestions, key=lambda stop: (stop["name"].casefold(), stop["id"]))


def get_departures(provider_id: str, stop_id: str, line_id: str | None = None) -> list[dict[str, Any]]:
	sql = """
		SELECT line_id, direction, departure_minutes
		FROM departures
		WHERE provider_id = ? AND stop_id = ?
	"""
	parameters: list[Any] = [provider_id, stop_id]
	if line_id is not None:
		sql += " AND line_id = ?"
		parameters.append(line_id)
	sql += " ORDER BY departure_minutes"
	with get_connection() as connection:
		return [dict(row) for row in connection.execute(sql, parameters).fetchall()]


def get_line_stops(provider_id: str) -> dict[str, set[str]]:
	with get_connection() as connection:
		rows = connection.execute(
			"SELECT DISTINCT line_id, stop_id FROM departures WHERE provider_id = ?",
			(provider_id,),
		).fetchall()
	line_stops: dict[str, set[str]] = {}
	for row in rows:
		line_stops.setdefault(row["line_id"], set()).add(row["stop_id"])
	return line_stops


def find_user_by_email(email: str) -> dict[str, Any] | None:
	with get_connection() as connection:
		row = connection.execute(
			"SELECT id, email, name, birthdate, password_hash FROM users WHERE email = ? COLLATE NOCASE",
			(email.strip().lower(),),
		).fetchone()
	if not row:
		return None
	user = dict(row)
	user["password"] = user.pop("password_hash")
	return user


def create_user(email: str, name: str, password_hash: str, birthdate: str | None) -> dict[str, Any]:
	with get_connection() as connection:
		cursor = connection.execute(
			"""
			INSERT INTO users (email, name, birthdate, password_hash, created_at)
			VALUES (?, ?, ?, ?, ?)
			""",
			(
				email.strip().lower(),
				name.strip(),
				birthdate or "",
				password_hash,
				datetime.now(timezone.utc).isoformat(),
			),
		)
		user_id = cursor.lastrowid
	return {
		"id": user_id,
		"email": email.strip().lower(),
		"name": name.strip(),
		"birthdate": birthdate or "",
	}


def _main() -> None:
	parser = argparse.ArgumentParser(description="Initialize the Twoj Autobus SQLite database.")
	parser.add_argument(
		"--reimport-transit",
		action="store_true",
		help="Replace imported provider, stop, line, and timetable data from source JSON files.",
	)
	arguments = parser.parse_args()
	initialize_database(reimport_transit=arguments.reimport_transit)
	print(f"SQLite database ready: {get_database_path()}")


if __name__ == "__main__":
	_main()
