# Security Audit – ride2gether-moto-buddies
**Datum:** 2026-05-09  
**Branch:** `security/audit-2026-05-09`  
**Auditor:** Claude Sonnet 4.6 (automatisiert)  
**Scope:** Statische Quellcode-Analyse (100 Vektoren) + passiver Live-Recon  

---

## Executive Summary

| Severity | Gefunden | Auto-gefixt | Manuell | Ignoriert |
|----------|----------|-------------|---------|-----------|
| CRITICAL | 0        | –           | –       | –         |
| HIGH     | 5        | 2           | 3       | 0         |
| MEDIUM   | 6        | 0           | 6       | 0         |
| LOW      | 3        | 0           | 0       | 3 (INFO)  |
| INFO     | 3        | 0           | 1       | 2         |

**2 HIGH-Findings automatisch gefixt** (Commits `7b5e0e6`, `030bd3d`).  
**3 HIGH-Findings benötigen manuelle Umsetzung** (EXIF-Stripping, unsafe-inline, Unbounded RPC params).

---

## Phase 2 – Live-Recon Ergebnisse

### Security-Header (curl -I https://ride2gether-moto-buddies.vercel.app)

| Header                    | Wert                                                       | Bewertung |
|---------------------------|------------------------------------------------------------|-----------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`           | ✅ Korrekt |
| `X-Frame-Options`         | `DENY`                                                     | ✅ Korrekt |
| `X-Content-Type-Options`  | `nosniff`                                                  | ✅ Korrekt |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                          | ✅ Korrekt |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=(self)`             | ✅ Korrekt |
| `X-XSS-Protection`        | `1; mode=block`                                            | ⚠️ Deprecated, harmlos |
| `Content-Security-Policy` | `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (vor Fix) | ⚠️ Zu permissiv |
| `access-control-allow-origin` | `*`                                                   | ℹ️ Standard für Vercel static (kein credentials-Flag) |

### Exponierte Pfade

| Pfad               | HTTP-Status | Ergebnis                                          |
|--------------------|-------------|---------------------------------------------------|
| `/.git/config`     | 200         | SPA-Rewrite → `index.html` (nicht exponiert)      |
| `/.env`            | 200         | SPA-Rewrite → `index.html` (nicht exponiert)      |
| `/.well-known/security.txt` | 200 | SPA-Rewrite → `index.html` (fehlt!)           |
| `/robots.txt`      | 200         | Vorhanden, korrekt                                |
| `/sitemap.xml`     | 200         | SPA-Rewrite → `index.html`                       |
| `/admin`           | 200         | SPA-Rewrite (existiert nicht als Route)           |
| `/api`             | 200         | SPA-Rewrite (kein Backend)                       |
| `/graphql`         | 200         | SPA-Rewrite (kein GraphQL)                       |
| JS-Sourcemaps      | N/A         | Sourcemaps nicht explizit konfiguriert; Vite deaktiviert sie in prod standardmäßig |

---

## Phase 3 – Findings

### HIGH

---

#### V97 – react-router-dom XSS via Open Redirect (GHSA-2w69-qvjg-hvjx)
**Datei:** `package.json` (war: `react-router-dom@6.26.2`)  
**Severity:** HIGH  
**Status:** ✅ Gefixt – Commit `7b5e0e6`

**Beschreibung:**  
`react-router-dom 6.0.0–6.30.2` ist anfällig für XSS via Open Redirect. Ein Angreifer kann eine manipulierte URL konstruieren, die einen Script-Injection-Punkt öffnet. Betrifft alle Nutzer, die auf eine präparierte URL klicken.

**Fix:**  
`npm audit fix` hat `react-router-dom` auf `6.30.3` aktualisiert (und transitiv `@remix-run/router` und `react-router` gepatcht). Keine API-Änderungen.

---

#### V73 – rollup Arbitrary File Write via Path Traversal (GHSA-mw96-cpmx-2vgc)
**Datei:** `package-lock.json` (war: `rollup@4.x <4.58.0`)  
**Severity:** HIGH (Build-Umgebung)  
**Status:** ✅ Gefixt – Commit `7b5e0e6`

**Beschreibung:**  
rollup (Build-Tool, DevDependency) erlaubte in bestimmten Plugin-Szenarien Path Traversal und damit Arbitrary File Write auf dem Build-Server. Kein Runtime-Impact, aber gefährlich in CI/CD-Pipelines.

**Fix:** Per `npm audit fix` auf gepatchte Version aktualisiert.

---

#### V75 – flatted Prototype Pollution + UnboundedRecursion DoS (GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh)
**Datei:** `package-lock.json` (transitiv via eslint)  
**Severity:** HIGH  
**Status:** ✅ Gefixt – Commit `7b5e0e6`

**Beschreibung:**  
`flatted ≤3.4.1` ist anfällig für Prototype Pollution und unbounded Rekursion DoS in der `parse()`-Funktion. Nur DevDependency (via eslint), kein Production-Impact.

**Fix:** Per `npm audit fix` gepatcht.

---

#### V58 – Kein EXIF-Stripping bei Photo-Uploads (PRIVACY CRITICAL)
**Datei:** `src/lib/supabase.ts:107–144`  
**Severity:** HIGH  
**Status:** ❌ Manuell erforderlich (>5 Zeilen, erfordert neue Library oder Edge Function)

**Beschreibung:**  
Die `uploadPhoto()`-Funktion prüft MIME-Typ und Dateigröße, strippt aber **keine EXIF-Metadaten**. Fotos (JPEG/PNG) können GPS-Koordinaten, Gerätedaten und Zeitstempel enthalten. Da ride2gether explizit Motorradfahrer mit Standort-Matching verbindet, sind Fotos ein direkter Leak-Kanal für Heimatadresse und regelmäßige Standorte.

**PoC:** Foto mit EXIF-GPS hochladen → Öffentliche Supabase-Storage-URL abrufen → EXIF auslesen via `exiftool <url>`.

**Empfehlung:**
```ts
// Option A: Browser-seitig (Canvas-Roundtrip entfernt EXIF):
const canvas = document.createElement('canvas');
canvas.width = img.naturalWidth;
canvas.height = img.naturalHeight;
canvas.getContext('2d')!.drawImage(img, 0, 0);
canvas.toBlob(resolve, 'image/jpeg', 0.92);

// Option B: Supabase Edge Function mit sharp:
import sharp from 'npm:sharp';
const stripped = await sharp(buffer).rotate().toBuffer(); // rotate() wendet EXIF-Rotation an und entfernt Metadaten
```

---

#### V43 – CSP enthielt 'unsafe-eval' in script-src
**Datei:** `vercel.json:32`  
**Severity:** HIGH  
**Status:** ✅ Gefixt – Commit `030bd3d`

**Beschreibung:**  
`'unsafe-eval'` in `script-src` erlaubt `eval()`, `new Function()` und ähnliche Dynamik. In einer XSS-Kette ermöglicht dies die Ausführung beliebiger Strings als Code. React-Produktions-Builds benötigen `eval` nicht.

**Fix:** `'unsafe-eval'` aus CSP `script-src` entfernt.

**Noch offen:** `'unsafe-inline'` ist weiterhin gesetzt (siehe V43b unten).

---

### MEDIUM

---

#### V43b – CSP 'unsafe-inline' in script-src schwächt XSS-Schutz
**Datei:** `vercel.json:32`  
**Severity:** MEDIUM  
**Status:** ❌ Manuell (Nonce/Hash-Migration erfordert Vite-Plugin-Anpassung)

**Beschreibung:**  
`'unsafe-inline'` erlaubt inline-`<script>`-Tags und `javascript:`-URLs. Für einen Angreifer, der HTML in die Seite injizieren kann, reicht `<script>payload</script>` aus. Für eine React SPA ohne serverseitiges Templating ist `'unsafe-inline'` in der Regel überflüssig.

**Empfehlung:** Nonce-basierte CSP mit `vite-plugin-csp` oder Build-Zeit-Hash-Generierung implementieren:
```json
"script-src 'self' 'nonce-{NONCE}'"
```

---

#### V100 – Unbegrenzte p_limit-Parameter in RPC-Funktionen
**Datei:** `sql/01_MIGRATION.sql:158` (`get_potential_matches`), `sql/02_EVENTS_MIGRATION.sql:15` (`get_events`)  
**Severity:** MEDIUM  
**Status:** ❌ Manuell (SQL-Migration erforderlich)

**Beschreibung:**  
Beide SECURITY DEFINER-Funktionen nehmen `p_limit INTEGER` ohne obere Schranke entgegen. Direkter API-Aufruf mit `p_limit=100000` kann große Datensätze zurückliefern und die Datenbank belasten.

```sql
-- get_potential_matches
SELECT public.get_potential_matches(auth.uid(), 100000);
-- get_events  
SELECT public.get_events(100000, 0);
```

**Empfehlung:**
```sql
IF p_limit > 100 THEN p_limit := 100; END IF;
```

---

#### V29 – Kein DB-seitiger LENGTH-Check auf messages.content / group_messages.content
**Datei:** `sql/01_MIGRATION.sql:81,113`  
**Severity:** MEDIUM  
**Status:** ❌ Manuell (SQL-Migration)

**Beschreibung:**  
`messages.content TEXT NOT NULL` und `group_messages.content TEXT NOT NULL` haben keinen `CHECK (char_length(content) <= N)`. Chat.tsx erzwingt client-seitig 2000 Zeichen; direkter Supabase-API-Aufruf umgeht dies. GroupChat.tsx (Gruppen-Nachrichten) hat gar kein Client-Limit.

**Empfehlung:**
```sql
ALTER TABLE public.messages
  ADD CONSTRAINT chk_messages_content_length CHECK (char_length(content) <= 2000);
ALTER TABLE public.group_messages
  ADD CONSTRAINT chk_group_messages_content_length CHECK (char_length(content) <= 2000);
```

---

#### V83 – Potenziell defekter FOR UPDATE in join_event (Race-Condition-Schutz)
**Datei:** `sql/02_EVENTS_MIGRATION.sql:89–96`  
**Severity:** MEDIUM  
**Status:** ❌ Manuell (SQL-Migration, unkritischer Pfad wenn Funktion fehlschlägt)

**Beschreibung:**  
```sql
SELECT g.max_members, COUNT(gm.user_id)
INTO   v_max, v_count
...
GROUP BY g.max_members
FOR UPDATE;  -- ← PostgreSQL erlaubt FOR UPDATE nicht mit GROUP BY + Aggregaten
```
PostgreSQL verbietet `FOR UPDATE` in Verbindung mit Aggregatfunktionen (`COUNT`). Wenn die Datenbank diesen Fehler wirft, ist die gesamte `join_event`-Funktion funktionsunfähig – was auch bedeutet, dass der Kapazitäts-Check nie greift.

**Empfehlung:** Aufteilen in separate Statements:
```sql
SELECT g.max_members INTO v_max FROM public.groups WHERE id = p_group_id FOR UPDATE;
SELECT COUNT(*) INTO v_count FROM public.group_members WHERE group_id = p_group_id;
```

---

#### V92 – Volle GPS-Präzision in user_locations gespeichert (Stalkerware-Risiko)
**Datei:** `sql/06_ZUSATZ_FUNKTIONEN.sql:20–22`, `src/lib/supabase.ts:99–104`  
**Severity:** MEDIUM  
**Status:** ❌ Manuell (Trade-off mit Matching-Qualität abwägen)

**Beschreibung:**  
GPS-Koordinaten werden mit voller Präzision (~1 m) gespeichert. Die `Standort gematchter Nutzer`-RLS-Policy erlaubt einem gematchten Nutzer den direkten Zugriff auf `user_locations`. Ein böswilliger Nutzer könnte regelmäßig Koordinaten abrufen und Bewegungsprofile erstellen.

**Empfehlung:** Koordinaten vor dem Speichern auf ~1 km runden:
```sql
ST_MakePoint(round(p_lng::numeric, 2), round(p_lat::numeric, 2))::GEOGRAPHY
```
(2 Dezimalstellen ≈ ±1 km Unschärfe – ausreichend für Distanz-Matching.)

---

#### V83b – Creator kann Gruppe per direktem REST-DELETE verlassen
**Datei:** `sql/01_MIGRATION.sql:346–347`  
**Severity:** MEDIUM  
**Status:** ❌ Manuell

**Beschreibung:**  
Die RLS-Policy `"Gruppe verlassen" ... DELETE USING (auth.uid() = user_id)` erlaubt auch dem Creator, sich selbst direkt aus `group_members` zu löschen (ohne die `leave_event`-Funktion). Die Prüfung `creator_cannot_leave` existiert nur in der Funktion.

**Empfehlung:**
```sql
CREATE POLICY "Gruppe verlassen"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND creator_id = auth.uid())
  );
```

---

### LOW / INFO

---

#### V5 – Account-Enumeration via Supabase-Fehlermeldungen
**Datei:** `src/pages/Auth.tsx:48–50`  
**Severity:** LOW  
**Status:** ℹ️ Ignoriert (Supabase-Default, konfigurierbar im Dashboard)

**Beschreibung:**  
Supabase's `signInWithPassword` gibt unterschiedliche Fehlermeldungen zurück (z.B. "Invalid login credentials" vs. "Email not confirmed"). Die App leitet diese direkt an den Nutzer weiter und ermöglicht damit Account-Enumeration.

**Empfehlung:** Im Supabase Dashboard "Email confirmation" aktivieren und generische Fehlermeldungen konfigurieren. Client-seitig alle Auth-Fehler auf eine neutrale Meldung normalisieren.

---

#### V7 – Schwaches Passwort-Minimum (6 Zeichen)
**Datei:** `src/pages/Auth.tsx:145`  
**Severity:** LOW  
**Status:** ℹ️ Ignoriert (Supabase-Default, konfigurierbar)

**Beschreibung:**  
`minLength={6}` entspricht Supabase's Standardwert. Keine Komplexitätsanforderungen. Empfehlung: Supabase-Dashboard → Auth → Password Strength auf mindestens 8 Zeichen und 1 Sonderzeichen setzen.

---

#### V79 – Keine security.txt vorhanden
**Datei:** `public/.well-known/security.txt` (fehlt)  
**Severity:** INFO  
**Status:** ❌ Manuell empfohlen

**Beschreibung:**  
`/.well-known/security.txt` fehlt. Sicherheitsforscher haben keinen offiziellen Meldeweg.

**Empfehlung:**
```
Contact: mailto:security@ride2gether.app
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: de, en
```

---

#### V22 – CORS Wildcard auf Vercel Static Hosting
**Severity:** INFO  
**Status:** ℹ️ Ignoriert

`access-control-allow-origin: *` ist Standard für Vercel-Static-Deployments ohne `credentials: true`. Da kein sensitiver Inhalt direkt serviert wird (API-Calls gehen an Supabase mit eigener CORS-Konfiguration), ist dies akzeptabel.

---

#### V44 – Deprecated X-XSS-Protection Header
**Severity:** INFO  
**Status:** ℹ️ Ignoriert

`X-XSS-Protection: 1; mode=block` ist in modernen Browsern wirkungslos und in Chrome seit 2019 entfernt. Kein Schaden, aber redundant.

---

## Was bewusst NICHT geändert wurde

| Item | Begründung |
|------|-----------|
| `vite` Update auf v8 | Breaking Change (`npm audit fix --force` abgelehnt). Separate Migration erforderlich. |
| `'unsafe-inline'` aus CSP | Erfordert Nonce/Hash-Integration mit Vite Build Pipeline (>5 Zeilen, >2 Dateien). |
| EXIF-Stripping | Neue Abhängigkeit (canvas API oder sharp) + >5 Zeilen. |
| DB-Migrations (CHECK-Constraints, GPS-Fuzzing, RLS-Fixes) | SQL-Migrationen benötigen koordinierten Rollout gegen die Live-Datenbank. |
| `package.json` Version-Constraints | `^6.26.2` erlaubt bereits 6.30.3; Lock-File ist maßgeblich. `bun.lockb` muss manuell per `bun install` regeneriert werden. |

---

## Commit-Übersicht

| Commit | Fix | Vectors |
|--------|-----|---------|
| `7b5e0e6` | react-router XSS, rollup path traversal, flatted prototype pollution, +14 moderate deps | V97, V73, V75 |
| `030bd3d` | `unsafe-eval` aus CSP entfernt | V43 |

---

*Generiert am 2026-05-09 — ride2gether Security Audit*
