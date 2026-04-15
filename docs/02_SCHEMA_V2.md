# 02 – Datenbankschema v2 (PostGIS)

## Architektur-Entscheidungen

### PostGIS statt Geokoordinaten als Zahlen
Standorte werden als nativer `GEOGRAPHY(POINT, 4326)`-Typ gespeichert.
Das ermöglicht `ST_DWithin()` und `ST_Distance()` – PostgreSQL-Funktionen,
die Distanzen auf der Erdoberfläche in Metern berechnen (Haversine-Formel).

### `user_locations` separat von `profiles`
Standorte werden deutlich häufiger aktualisiert als Profildaten (z. B. beim App-Start).
Die Trennung verhindert unnötige Schreibzugriffe auf die große `profiles`-Tabelle.

---

## Tabellen

### `profiles`
Hauptprofil eines Nutzers. Wird automatisch nach der Registrierung via Trigger angelegt.

| Spalte               | Typ        | Beschreibung                                  |
|----------------------|------------|-----------------------------------------------|
| `id`                 | UUID (PK)  | Verknüpft mit `auth.users.id`                 |
| `username`           | TEXT       | Eindeutiger Benutzername (optional)            |
| `full_name`          | TEXT       | Anzeigename                                   |
| `age`                | INTEGER    | Alter (18–99)                                 |
| `bio`                | TEXT       | Selbstbeschreibung                            |
| `motorcycle_brand`   | TEXT       | Hersteller des Motorrads                      |
| `motorcycle_model`   | TEXT       | Modell des Motorrads                          |
| `motorcycle_year`    | INTEGER    | Baujahr                                       |
| `riding_style`       | TEXT       | `entspannt`, `normal`, `sportlich`, `alle`    |
| `max_distance_km`    | INTEGER    | Max. Distanz zum Treffpunkt (10–200 km)       |
| `preferred_group_size` | INTEGER  | Bevorzugte Gruppengröße (0 = egal, 1–8)       |
| `avatar_url`         | TEXT       | URL zum Profilfoto (Supabase Storage)         |
| `bike_photo_url`     | TEXT       | URL zum Motorradfoto (Supabase Storage)       |
| `is_active`          | BOOLEAN    | Profil aktiv/deaktiviert                      |

### `user_locations`
Separierte Standorttabelle für häufige GPS-Updates.

| Spalte      | Typ                    | Beschreibung                          |
|-------------|------------------------|---------------------------------------|
| `user_id`   | UUID (PK, FK)          | Verknüpft mit `profiles.id`           |
| `location`  | GEOGRAPHY(POINT, 4326) | WGS84-Koordinate (lng, lat)           |
| `updated_at`| TIMESTAMPTZ            | Letztes Update (Trigger automatisch)  |

**GiST-Index:** `CREATE INDEX idx_user_locations_gist ON user_locations USING GIST(location);`

Dieser Index ist der entscheidende Performance-Hebel: Ohne ihn läuft `ST_DWithin()`
über alle Zeilen (Full Table Scan), mit ihm arbeitet PostgreSQL mit einem
räumlichen Suchbaum – bei 100.000 Nutzern bleibt die Query unter 10 ms.

### `user_oauth_providers`
Speichert Google- und Facebook-Verknüpfungen für spätere Token-Verwendung.

| Spalte                    | Typ    | Beschreibung                              |
|---------------------------|--------|-------------------------------------------|
| `id`                      | UUID   | Primärschlüssel                           |
| `user_id`                 | UUID   | FK → `profiles.id`                        |
| `provider`                | TEXT   | `google` oder `facebook`                  |
| `provider_user_id`        | TEXT   | ID beim jeweiligen Provider               |
| `access_token_encrypted`  | TEXT   | Token via `pgcrypto.encrypt()` gesichert  |
| `refresh_token_encrypted` | TEXT   | Token via `pgcrypto.encrypt()` gesichert  |

> **Hinweis zur Token-Verschlüsselung:** Supabase OAuth speichert Tokens intern.
> Diese Tabelle ist für den Fall gedacht, dass eigene API-Calls zu Google/Facebook
> nötig werden (z. B. Kontakte importieren). Tokens mit `pgcrypto.encrypt()` + AES-256
> verschlüsseln, niemals im Klartext speichern.

### `swipes`
Jede Wisch-Entscheidung eines Nutzers.

| Spalte      | Typ   | Beschreibung                  |
|-------------|-------|-------------------------------|
| `swiper_id` | UUID  | Wer gewischt hat              |
| `swiped_id` | UUID  | Wen er gewischt hat           |
| `direction` | TEXT  | `like` oder `pass`            |
| `UNIQUE`    | –     | `(swiper_id, swiped_id)`      |

### `matches`
Gegenseitige Likes – angelegt von der `process_swipe()` Funktion.

| Spalte     | Typ  | Beschreibung                                           |
|------------|------|--------------------------------------------------------|
| `user1_id` | UUID | Immer `LEAST(id_a, id_b)` – verhindert Duplikate       |
| `user2_id` | UUID | Immer `GREATEST(id_a, id_b)`                           |
| `UNIQUE`   | –    | `(user1_id, user2_id)`                                 |

### `messages`
Nachrichten zwischen zwei gematchten Nutzern. Realtime-aktiviert.

### `groups` / `group_members` / `group_messages`
Gruppen-Features für gemeinsame Touren und Events.

---

## Triggers

| Trigger                        | Tabelle        | Aktion                                          |
|--------------------------------|----------------|-------------------------------------------------|
| `trg_profiles_updated_at`      | `profiles`     | Setzt `updated_at = now()` bei jedem UPDATE     |
| `trg_locations_updated_at`     | `user_locations`| Setzt `updated_at = now()` bei jedem UPDATE    |
| `trg_on_auth_user_created`     | `auth.users`   | Legt nach Registrierung automatisch Profil an   |

---

## Row Level Security

Alle Tabellen haben RLS aktiviert. Wichtigste Regeln:

- **profiles:** Aktive Profile sind für alle lesbar; schreiben/aktualisieren nur der eigene Nutzer
- **user_locations:** Lesen für alle erlaubt (für Matching nötig); schreiben nur eigener Nutzer
- **messages:** Nur Teilnehmer des zugehörigen Matches können lesen/schreiben
- **group_messages:** Nur Gruppen-Mitglieder können lesen/schreiben
