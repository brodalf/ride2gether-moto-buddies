# 04 – Implementierungs-Fahrplan

## Technologie-Empfehlung: Supabase

Supabase eignet sich optimal für ride2gether:
- **PostgreSQL + PostGIS** – räumliche Queries (ST_DWithin) ohne Extraaufwand
- **Auth** – Google/Facebook OAuth out-of-the-box, kein eigener Server nötig
- **Realtime** – WebSocket-Chat via `postgres_changes`, kein extra Infra
- **Storage** – Profilfotos und Motorradbilder direkt in einem System
- **Row Level Security** – Datenschutz auf Datenbankebene, nicht im Anwendungscode

**Kein eigener Server nötig.** Der Supabase JS Client läuft direkt im Frontend.
PostgreSQL-Funktionen (`get_potential_matches`, `process_swipe`) übernehmen die Logik,
die sonst in einem API-Layer läge.

---

## Phase 1 – Fundament (erledigt)

**Ziel:** Supabase-Projekt mit vollständigem Schema und RLS.

- [x] PostGIS + pgcrypto aktivieren
- [x] `profiles` Tabelle mit allen Matching-Parametern
- [x] `user_locations` separat (GEOGRAPHY-Typ, GiST-Index)
- [x] `user_oauth_providers` für Token-Speicherung
- [x] `swipes`, `matches`, `messages`, `groups`, `group_members`, `group_messages`
- [x] Trigger: Profil automatisch nach Registrierung anlegen
- [x] RLS-Policies für alle Tabellen
- [x] `get_potential_matches()` mit drei harten Filtern
- [x] `process_swipe()` atomar (verhindert Race Conditions)
- [x] Zusatz-Funktionen: `update_user_location`, `get_user_matches`, `mark_messages_read`

---

## Phase 2 – Auth & Profil (erledigt)

**Ziel:** Echter Login, Profil speichern, Standort setzen.

- [x] Google OAuth via `supabase.auth.signInWithOAuth`
- [x] Facebook OAuth via `supabase.auth.signInWithOAuth`
- [x] E-Mail/Passwort (`signInWithPassword`, `signUp`)
- [x] Auth-Guard in `App.tsx` (schützt alle Routes außer `/` und `/auth`)
- [x] `ProfileSetup.tsx`: 6-Schritte-Wizard mit Supabase-Persistenz
  - [x] Persönliche Daten, Motorrad, Fahrstil, Distanz
  - [x] **Gruppengröße** (fehlte, nachträglich ergänzt)
  - [x] Foto-Upload in Supabase Storage
- [x] Geolocation-Standort automatisch beim Profil-Speichern setzen
- [x] Session-Management mit `onAuthStateChange`

---

## Phase 3 – Matching (erledigt)

**Ziel:** Echte Profile aus DB, Swipes persistieren, Matches erkennen.

- [x] `Matching.tsx` lädt Profile via `get_potential_matches` RPC
- [x] Drei harte Filter: Distanz gegenseitig, Fahrstil exakt, Gruppengröße exakt
- [x] `process_swipe` RPC bei jedem Swipe
- [x] Match-Toast wenn gegenseitiger Like erkannt
- [x] Bereits geswipt = nie wieder angezeigt

**Warum harte Filter statt Scoring?**
Ein Score-System (z. B. 40% Fahrstil / 40% Distanz / 20% Gruppe) produziert schlechte
Matches: Ein Nutzer mit komplett anderem Fahrstil taucht auf, weil er nah ist. Bei
ride2gether sind alle drei Kriterien gleichwertig – wer nicht passt, taucht nie auf.

---

## Phase 4 – Chat (erledigt)

**Ziel:** Persistente Nachrichten, Echtzeit-Updates.

- [x] `Chat.tsx` lädt Nachrichten aus `messages`-Tabelle
- [x] Supabase Realtime (`postgres_changes`) für Live-Updates
- [x] Ersten verfügbaren Match automatisch laden
- [x] `mark_messages_read` beim Öffnen des Chats
- [x] Nachrichten-Kanal wird bei Unmount sauber abgemeldet
- [x] URL-Parameter `?matchId=` für direktes Öffnen eines Chats

---

## Phase 5 – Offene Seiten (ausstehend)

**Ziel:** GroupChat, Calendar und Profile mit echten Daten befüllen.

### GroupChat.tsx
```
Anbinden an: groups, group_members, group_messages
- Gruppen laden: supabase.from('groups').select()
- Mitglieder: get_group_members_with_profiles() RPC
- Nachrichten: supabase.from('group_messages') + Realtime
- Gruppe beitreten/verlassen: group_members INSERT/DELETE
```

### Calendar.tsx
```
Anbinden an: groups (event_date IS NOT NULL)
- Events laden: supabase.from('groups').not('event_date', 'is', null)
- Filter nach riding_style
- Teilnehmer-Count: group_members COUNT
- "Teilnehmen" → group_members INSERT
```

### Profile.tsx
```
Anbinden an: profiles, get_user_stats()
- Profildaten laden: supabase.from('profiles').select().eq('id', userId)
- Statistiken: supabase.rpc('get_user_stats', { p_user_id: userId })
- Profil bearbeiten → profiles UPDATE
- Account löschen → supabase.auth.admin.deleteUser (nur server-seitig)
```

---

## Sicherheitshinweise

| Thema | Regel |
|-------|-------|
| GPS-Daten | Niemals rohe Koordinaten ans Frontend schicken – nur berechnete Distanz in km |
| Service Role Key | Darf niemals ins Frontend (nur für serverseitige Admin-Operationen) |
| RLS | Muss für jede neue Tabelle explizit aktiviert werden |
| OAuth-Tokens | Nur via pgcrypto verschlüsselt in `user_oauth_providers` speichern |
| Fotos | Bucket-Policy: Lesen öffentlich, Schreiben nur für eigene User-ID |
| Anon Key | Ist sicher im Frontend – RLS schützt alle Datenbankzugriffe |

---

## Reihenfolge für Produktions-Deployment

```
1. Supabase Projekt auf Production-Tier upgraden (für PostGIS + höhere Limits)
2. Custom Domain in Supabase Auth → Site URL eintragen
3. Google/Facebook OAuth Redirect URIs auf Produktions-Domain umstellen
4. Storage Bucket CORS für Produktions-Domain konfigurieren
5. .env.production mit Produktions-Keys befüllen
6. npm run build → dist/ deployen (Vercel / Netlify / eigener Server)
```
