# 07 – Implementierungs-Checkliste

Empfohlene Reihenfolge. Jeder Block kann eigenständig getestet werden.

---

## Block 1: Supabase-Projekt (30–60 Min, einmalig manuell)

- [ ] Supabase-Konto erstellen und neues Projekt anlegen
- [ ] PostGIS-Extension aktivieren (`postgis`, `pgcrypto`)
- [ ] `sql/01_MIGRATION.sql` im SQL Editor ausführen
- [ ] `sql/06_ZUSATZ_FUNKTIONEN.sql` im SQL Editor ausführen
- [ ] Storage Bucket `photos` anlegen (Public, max 5 MB)
- [ ] Realtime für `messages`-Tabelle prüfen (Database → Replication)

## Block 2: OAuth (30 Min, einmalig manuell)

- [ ] Google Cloud Console: OAuth 2.0 Client anlegen
  - [ ] Redirect URI: `https://<projekt>.supabase.co/auth/v1/callback`
  - [ ] Client ID + Secret in Supabase eintragen
- [ ] Facebook Developer Console: App anlegen
  - [ ] Redirect URI: `https://<projekt>.supabase.co/auth/v1/callback`
  - [ ] App ID + Secret in Supabase eintragen
  - [ ] App in „Live"-Modus versetzen

## Block 3: React-Projekt einrichten (15 Min)

- [ ] `npm install` (installiert auch `@supabase/supabase-js`)
- [ ] `.env.example` nach `.env` kopieren und Werte eintragen:
  - [ ] `VITE_SUPABASE_URL` (aus Supabase Settings → API)
  - [ ] `VITE_SUPABASE_ANON_KEY` (aus Supabase Settings → API)
- [ ] `npm run dev` starten und Startseite prüfen

## Block 4: Auth testen

- [ ] E-Mail/Passwort Registrierung ausprobieren
- [ ] Supabase Dashboard → Authentication → Users → Nutzer sichtbar?
- [ ] Supabase Dashboard → Table Editor → profiles → Eintrag automatisch angelegt?
- [ ] Google-Login ausprobieren (Redirect zurück zur App?)
- [ ] Facebook-Login ausprobieren

## Block 5: Profil-Setup testen

- [ ] Alle 5 Schritte durchlaufen
- [ ] Profilfoto hochladen → erscheint in Storage → `photos` Bucket?
- [ ] Motorradfoto hochladen → gleiches?
- [ ] Profil in Supabase `profiles` Tabelle aktualisiert?

## Block 6: Standort setzen (für Matching)

- [ ] Geolocation im Browser erlauben (Testnutzer 1)
- [ ] `user_locations` Tabelle: Eintrag vorhanden mit GEOGRAPHY-Wert?
- [ ] GiST-Index prüfen: `\d user_locations` im SQL Editor

## Block 7: Matching testen

- [ ] Zweiten Testnutzer anlegen mit unterschiedlichem Standort
- [ ] `get_potential_matches(user_id)` im SQL Editor manuell ausführen
- [ ] Beide Nutzer in der App sehen sich gegenseitig?
- [ ] Like-Swipe → `swipes` Tabelle prüfen
- [ ] Gegenseitiger Like → `matches` Tabelle: Eintrag vorhanden?
- [ ] Match-Notification erscheint in der App?

## Block 8: Chat testen

- [ ] Chat zwischen zwei gematchten Nutzern öffnen
- [ ] Nachricht senden → in `messages` Tabelle?
- [ ] Zweiter Browser-Tab: Nachricht kommt in Echtzeit an (Realtime)?
- [ ] Nachrichten bleiben nach Neuladen erhalten?

## Block 9: Sicherheit prüfen

- [ ] RLS aktiv: Können fremde Profile direkt per SQL gelesen werden? (Nein)
- [ ] Kann ein Nutzer Nachrichten in einem fremden Match senden? (Nein)
- [ ] Kann ein Nutzer das Profil eines anderen ändern? (Nein)
- [ ] Supabase API Keys: Nur Anon Key im Frontend, Service Role Key nirgends

---

## Nützliche SQL-Queries zum Testen

```sql
-- Alle Profile anzeigen
SELECT id, full_name, riding_style, max_distance_km FROM profiles;

-- Standorte anzeigen
SELECT user_id, ST_AsText(location), updated_at FROM user_locations;

-- Matches für einen Nutzer
SELECT * FROM get_potential_matches('<user-id>', 10);

-- Swipes anzeigen
SELECT swiper_id, swiped_id, direction FROM swipes ORDER BY created_at DESC;

-- Nachrichten eines Matches
SELECT * FROM messages WHERE match_id = '<match-id>' ORDER BY created_at;
```
