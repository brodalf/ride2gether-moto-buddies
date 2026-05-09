# Security Audit 2026-05-09 — Round 2

**Datum:** 2026-05-09 (zweite Audit-Runde)
**Branch:** `security/audit-2026-05-09`
**Auditor:** Claude Sonnet 4.6 (automatisiert)
**Scope:** Vollständige statische Analyse (100 Vektoren) + passiver Live-Recon
**Basis:** Vorheriger Audit R1 (PR #2, gemergt), open findings aus R1 wieder geprüft

---

## 🤔 ENTSCHEIDUNGEN ERFORDERLICH

### Q1: [V92] GPS-Präzision — Privacy vs. Matching-Qualität

**Kontext:** GPS-Koordinaten der Nutzer werden mit voller Präzision (~1 m) in `user_locations` gespeichert. Ein gematchter Nutzer kann den genauen Standort des Partners via Supabase REST abrufen (RLS-Policy `"Standort gematchter Nutzer"` erlaubt SELECT). Motorradfahrer-App: Heimatadresse und Pendelrouten wären lesbar.

**Optionen:**
- A) Keine Änderung — volle Präzision bleibt für genaues Matching (GPS <10 m). **Security:** Stalkerware-Risiko für alle gematschten User. **UX:** Bestmögliche Matching-Genauigkeit.
- B) Koordinaten auf 2 Dezimalstellen runden vor dem Speichern (≈±1 km) — `update_user_location` in SQL anpassen. **Security:** Heimatadresse nicht mehr aus Koordinaten ableitbar. **UX:** Matching bleibt gut (1 km Unschärfe ist für Motorradfahrer akzeptabel).
- C) Koordinaten auf 1 Dezimalstelle runden (≈±10 km). **Security:** Maximale Privatsphäre. **UX:** Matching-Qualität leidet deutlich, falsche Kandidaten möglich.

**Empfehlung:** Option B — 2 Dezimalstellen, 1 km Unschärfe ist der Standard-Kompromiss in Location-Privacy-Literatur und reicht für Motorradtouren vollständig aus.

**Wie antworten:** PR-Kommentar `DECISION Q1: <A/B/C>`

---

### Q2: [N1] esbuild/vite Moderate Vulnerability — Major Version Update

**Kontext:** `npm audit` meldet GHSA-67mh-4wv8-2f99 (esbuild ≤0.24.2 + vite ≤6.4.1): Jede Website kann beliebige Requests an den **Vite-Dev-Server** senden und Antworten lesen. **Betrifft ausschließlich lokale Entwicklung** — Vercel-Production-Deployment ist nicht betroffen. Fix erfordert `vite@8.x` (Breaking Change).

**Optionen:**
- A) Keine Änderung jetzt — Dev-Only-Risiko, Produktions-Nutzer nicht gefährdet. Ticket für vite@8-Migration öffnen. **Security:** Dev-Rechner exponiert, könnte Secrets aus lokaler .env leaken wenn Entwickler fremde Websites besucht. **Aufwand:** Null.
- B) vite@8-Migration mit Testphase (`npm audit fix --force`) — potenzielle API-Änderungen in vite.config.ts prüfen. **Security:** Dev-Server abgesichert. **Aufwand:** 2–4 Stunden, potenzielle Build-Konfigurationsanpassungen.
- C) Sofort `npm audit fix --force` ohne Testphase. **Security:** Abgesichert, aber potenzielle Build-Brüche ungeprüft.

**Empfehlung:** Option B — geplante vite@8-Migration mit lokalem Test. Dev-Rechner-Schutz ist real, aber Low-Urgency. Nicht mehr auf `npm audit fix --force` ohne Test.

**Wie antworten:** PR-Kommentar `DECISION Q2: <A/B/C>`

---

## Executive Summary

| Severity  | Gesamt | Auto-gefixt (R2) | Manuell erforderlich | Decision needed |
|-----------|--------|------------------|----------------------|-----------------|
| CRITICAL  | 0      | –                | –                    | –               |
| HIGH      | 1      | 0                | 1 (V58 EXIF)         | 0               |
| MEDIUM    | 7      | 1 (V85)          | 5                    | 1 (V92)         |
| LOW/INFO  | 4      | 1 (V79)          | 0                    | 1 (N1/vite)     |

**Gesamtstand (inkl. R1):** 3 HIGH-Fixes aus R1 automatisiert (V97, V73, V75, V43). Heute: 2 weitere SAFE-Fixes (V79, V85). **5 offene manuelle Findings** bleiben unverändert aus R1.

---

## Verifizierte Auto-Fixes (Round 2)

| Commit    | File                                      | Beschreibung                                       | Vektor |
|-----------|-------------------------------------------|----------------------------------------------------|--------|
| `97ecba2` | `public/.well-known/security.txt`         | Security-Kontakt für Responsible Disclosure erstellt | V79   |
| `aceeaf3` | `src/pages/Calendar.tsx`                  | INSERT+select statt separater Follow-up-Query (TOCTOU) | V85  |

### V79 — security.txt erstellt
**Datei:** `public/.well-known/security.txt` (neu)
**Severity:** INFO → behoben
**Was:** Kein offizieller Meldepfad für Sicherheitsforscher vorhanden. `/.well-known/security.txt` gemäß RFC 9116 erstellt. Vercel serviert statische Dateien vor SPA-Rewrite, daher ist die Datei korrekt erreichbar.

### V85 — Race Condition in Event-Erstellung behoben
**Datei:** `src/pages/Calendar.tsx:118–145`
**Severity:** MEDIUM → behoben
**Was:** Nach `INSERT INTO groups` wurde der neue Gruppen-ID per separater `SELECT ... ORDER BY created_at DESC LIMIT 1` Abfrage geholt. Bei zwei nahezu gleichzeitigen Event-Erstellungen desselben Nutzers konnte die falsche Gruppe als Admin-Ziel verwendet werden (TOCTOU-Fenster).

**Fix:** Supabase-Muster `.insert({...}).select("id").single()` verwendet, das intern PostgreSQL `RETURNING id` nutzt — atomarer Vorgang ohne Fenster für Race Condition.

```diff
- const { error } = await supabase.from("groups").insert({...});
- if (error) throw error;
- const { data: newGroup } = await supabase.from("groups").select("id")
-   .eq("creator_id", session.user.id).order("created_at", { ascending: false }).limit(1).single();
+ const { data: newGroup, error } = await supabase.from("groups")
+   .insert({...}).select("id").single();
+ if (error) throw error;
```

---

## RISKY — Manuelle Fixes nötig

*(Alle aus R1 übertragen, Status unverändert)*

---

### V58 — Kein EXIF-Stripping bei Photo-Uploads (HIGH, PRIVACY CRITICAL)

**Datei:** `src/lib/supabase.ts:107–144`
**Status:** ❌ Offen seit R1

**Beschreibung:** `uploadPhoto()` prüft MIME-Typ und Dateigröße, entfernt aber keine EXIF-Metadaten. JPEG/PNG-Fotos von Motorradfahrern können GPS-Koordinaten (Heimatadresse, regelmäßige Stopps) enthalten. Fotos werden in einen öffentlichen Supabase-Storage-Bucket geladen.

**Vorgeschlagener Fix:**
```typescript
// Option A: Browser-seitig (Canvas-Roundtrip — entfernt alle EXIF ohne neue Library):
async function stripExif(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  return new File([blob], file.name, { type: blob.type });
}
// Aufruf vor uploadPhoto():
const safeFile = await stripExif(profileData.avatarFile);
avatarUrl = await uploadPhoto(userId, safeFile, 'avatar');
```

**Warum RISKY:** `createImageBitmap` + `OffscreenCanvas` haben Browser-Kompatibilitätslücken (iOS Safari <16). Wenn der Strip-Aufruf fehlschlägt und der Fehler nicht abgefangen wird, bricht der Upload-Flow für einen Teil der Nutzer. Erfordert: Browser-Kompatibilitätstest, Fallback-Strategie (Ablehnen vs. Warnung vs. Upload ohne Strip).

**Test-Plan:**
1. Test mit JPEG mit eingebetteten GPS-Koordinaten
2. Test auf iOS Safari 15, Chrome Mobile, Firefox Android
3. Verify via `exiftool` dass Koordinaten nach Upload fehlen
4. Test Fehlerfall (z.B. korruptes Bild) → kein stiller Upload

---

### V43b — CSP `unsafe-inline` in script-src (MEDIUM)

**Datei:** `vercel.json:32`
**Status:** ❌ Offen seit R1

**Aktuell:** `script-src 'self' 'unsafe-inline'`

**Beschreibung:** `unsafe-inline` erlaubt inline-`<script>`-Tags. Für einen Angreifer der HTML injizieren kann reicht `<script>payload</script>` — die CSP schützt nicht.

**Vorgeschlagener Fix:**
```typescript
// vite.config.ts — Nonce-Plugin:
import { createHash } from 'crypto';
// Oder: vite-plugin-csp (npm install --save-dev vite-plugin-csp)
// Erzeugt zur Build-Zeit Hashes aller Inline-Scripts und injiziert sie in CSP
```
```json
// vercel.json:
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'sha256-<HASH>';"
```

**Warum RISKY:** Erfordert Vite-Build-Plugin-Integration. React-SPA-Frameworks injizieren teils inline-Scripts die noch keinen Hash haben. Muss mit `vite build && serve` vollständig getestet werden bevor Deployment.

**Test-Plan:** Build in staging deployen, Browser-Konsole auf CSP-Violations prüfen, alle Routen durchtesten.

---

### V100 — Unbegrenzte `p_limit`-Parameter in RPC-Funktionen (MEDIUM)

**Datei:** `sql/01_MIGRATION.sql:158` (`get_potential_matches`), `sql/02_EVENTS_MIGRATION.sql:15` (`get_events`)
**Status:** ❌ Offen seit R1

**Beschreibung:** Direkter Supabase-API-Aufruf mit `p_limit=100000` kann DB-Last erzeugen.

**Vorgeschlagener Fix:**
```sql
CREATE OR REPLACE FUNCTION public.get_potential_matches(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 10
) ...
BEGIN
  p_limit := LEAST(p_limit, 100);  -- Hard cap hinzufügen
  ...
END;
```
```sql
CREATE OR REPLACE FUNCTION public.get_events(
  p_limit  INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) ...
BEGIN
  p_limit := LEAST(p_limit, 200);  -- Hard cap hinzufügen
  ...
END;
```

**Warum RISKY:** SQL-Funktions-Ersatz gegen Live-DB. Muss koordiniert als Supabase-Migration ausgeführt werden. Kein Datenbank-State verändert, aber Rollback erfordert erneutes `CREATE OR REPLACE`.

---

### V29 — Kein DB-seitiger Längen-Check auf Nachrichten-Content (MEDIUM)

**Datei:** `sql/01_MIGRATION.sql:82,113`
**Status:** ❌ Offen seit R1

**Vorgeschlagener Fix:**
```sql
ALTER TABLE public.messages
  ADD CONSTRAINT chk_messages_content_length
    CHECK (char_length(content) BETWEEN 1 AND 2000);

ALTER TABLE public.group_messages
  ADD CONSTRAINT chk_group_messages_content_length
    CHECK (char_length(content) BETWEEN 1 AND 2000);
```

**Warum RISKY:** `ALTER TABLE ... ADD CONSTRAINT` auf einer Live-Tabelle sperrt kurz (Access Exclusive Lock). Bei großen Message-Tabellen kann dies merkbares Downtime-Risiko bedeuten. Empfehlung: `NOT VALID` zuerst, dann validate in separatem Statement:
```sql
ALTER TABLE public.messages
  ADD CONSTRAINT chk_messages_content_length
    CHECK (char_length(content) BETWEEN 1 AND 2000) NOT VALID;
ALTER TABLE public.messages VALIDATE CONSTRAINT chk_messages_content_length;
```

---

### V83 — `FOR UPDATE` mit `GROUP BY` in `join_event` (MEDIUM)

**Datei:** `sql/02_EVENTS_MIGRATION.sql:89–96`
**Status:** ❌ Offen seit R1

**Beschreibung:** PostgreSQL verbietet `FOR UPDATE` in Verbindung mit Aggregatfunktionen. Die `join_event`-Funktion ist vermutlich broken oder nutzt einen anderen Code-Pfad.

**Vorgeschlagener Fix:**
```sql
-- Aufteilen in separate Statements:
SELECT g.max_members INTO v_max
  FROM public.groups WHERE id = p_group_id FOR UPDATE;

SELECT COUNT(*) INTO v_count
  FROM public.group_members WHERE group_id = p_group_id;
```

**Warum RISKY:** Ändert Locking-Verhalten der Kernfunktion für Event-Beitritt. Benötigt Lasttests um sicherzustellen, dass kein Deadlock-Szenario entsteht. Test: `join_event` gleichzeitig von 10 Sessions auf vollem Event.

---

### V83b — Creator kann Gruppe per direktem REST-DELETE verlassen (MEDIUM)

**Datei:** `sql/01_MIGRATION.sql:346–347`
**Status:** ❌ Offen seit R1

**Beschreibung:** RLS-Policy `"Gruppe verlassen"` erlaubt Creator direktes DELETE aus `group_members` ohne die `leave_event`-Schutzfunktion zu durchlaufen. Ein Creator kann sich als Admin-Mitglied entfernen ohne das Event zu löschen, hinterlässt ein Event ohne Organisator.

**Vorgeschlagener Fix:**
```sql
DROP POLICY IF EXISTS "Gruppe verlassen" ON public.group_members;
CREATE POLICY "Gruppe verlassen"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );
```

**Warum RISKY:** Ändert bestehende RLS-Policy. Muss mit `DROP + CREATE` als atomarer Schritt in Supabase SQL Editor. Test: Verify Creator-DELETE geblockt, Member-DELETE weiterhin erlaubt.

---

## Live-Recon Ergebnisse (Round 2)

### Security-Header (curl -I https://ride2gether-moto-buddies.vercel.app)

| Header                        | Wert                                                | Bewertung |
|-------------------------------|-----------------------------------------------------|-----------|
| `Strict-Transport-Security`   | `max-age=63072000; includeSubDomains; preload`      | ✅ |
| `X-Frame-Options`             | `DENY`                                              | ✅ |
| `X-Content-Type-Options`      | `nosniff`                                           | ✅ |
| `Referrer-Policy`             | `strict-origin-when-cross-origin`                   | ✅ |
| `Permissions-Policy`          | `camera=(), microphone=(), geolocation=(self)`      | ✅ |
| `Content-Security-Policy`     | `script-src 'self' 'unsafe-inline'` (unsafe-eval entfernt ✅, unsafe-inline noch offen V43b) | ⚠️ |
| `X-XSS-Protection`            | `1; mode=block` (deprecated, harmlos)               | ℹ️ |
| `access-control-allow-origin` | `*` (Vercel-Static-Standard, kein credentials-Flag) | ℹ️ |

### Exponierte Pfade (alle Vercel SPA-Rewrite → index.html, kein Leak)

| Pfad                             | HTTP-Code | Ergebnis                                    |
|----------------------------------|-----------|---------------------------------------------|
| `/.git/config`                   | 200       | SPA-Rewrite → index.html ✅                 |
| `/.env`                          | 200       | SPA-Rewrite → index.html ✅                 |
| `/.well-known/security.txt`      | 200       | SPA-Rewrite → index.html (vor Fix) → nach Fix: statische Datei |
| `/robots.txt`                    | 200       | Vorhanden (`content-type: text/plain`) ✅   |
| `/admin`                         | 200       | SPA-Rewrite → index.html ✅                 |
| `/debug`                         | 200       | SPA-Rewrite → index.html ✅                 |
| `/assets/index-*.js.map`         | 200       | `content-type: text/html` → SPA-Rewrite, keine Source-Map exponiert ✅ |
| JS-Bundle `sourceMappingURL`     | –         | Kein `//# sourceMappingURL` im Bundle-Tail ✅ |

**Kein GraphQL-Endpoint** (kein `/graphql`, keine Introspection-Angriffsfläche). Kein Debug-Endpoint. Keine echten Secrets im JS-Bundle (VITE_SUPABASE_ANON_KEY ist design-intended public).

---

## Zusätzliche Beobachtungen

### V41b — `dangerouslySetInnerHTML` in shadcn/ui chart.tsx (INFO)

**Datei:** `src/components/ui/chart.tsx:79`
**Severity:** INFO (kein User-Input-Pfad)

`dangerouslySetInnerHTML` wird in `ChartStyle` verwendet, um CSS Custom Properties in einen `<style>`-Tag zu rendern. Alle Werte kommen aus statischer Chart-Konfiguration (Farb-Strings, Theme-Klassen), kein User-Input fließt in diesen Pfad. Das Chart-Component wird in keiner aktuellen Seite eingebunden. Keine Aktion erforderlich; bei zukünftiger Nutzung sicherstellen, dass nur whitelisted Farbwerte übergeben werden.

### N1 — esbuild/vite Dev-Server Vulnerability (MODERATE, prod LOW)

**GHSA-67mh-4wv8-2f99:** esbuild ≤0.24.2 / vite ≤6.4.1 — Dev-Server akzeptiert Cross-Origin-Requests. Ausschließlich bei laufendem `vite dev` auf dem Entwickler-Rechner relevant. Vercel-Produktion nicht betroffen. Fix: vite@8.x (Breaking Change) — siehe DECISION Q2.

---

## Was bewusst NICHT geändert wurde

| Item                          | Begründung                                          |
|-------------------------------|-----------------------------------------------------|
| vite@8 Update                 | Breaking Change, muss bewusst getestet werden (DECISION Q2) |
| GPS-Fuzzing (V92)             | Produkt-Entscheidung erforderlich (DECISION Q1)     |
| DB-Constraints (V29)          | Live-DB-Migration mit Lock-Risiko → koordinierter Rollout |
| `join_event` FOR UPDATE (V83) | Ändert Locking-Verhalten → Lasttest erforderlich    |
| RLS-Policy Creator-Leave (V83b) | DROP+CREATE Policy in Live-DB → geplante Migration |
| CSP `unsafe-inline` (V43b)   | Vite-Plugin-Integration, Build-Test erforderlich    |
| EXIF-Stripping (V58)          | Browser-Kompatibilitätslücken iOS Safari, Test-Plan erforderlich |

---

## Commit-Übersicht (R1 + R2)

| Commit    | Fix                                        | Vektoren       |
|-----------|--------------------------------------------|----------------|
| `7b5e0e6` | react-router XSS, rollup, flatted deps     | V97, V73, V75  |
| `030bd3d` | `unsafe-eval` aus CSP entfernt             | V43            |
| `97ecba2` | security.txt erstellt                      | V79            |
| `aceeaf3` | Calendar.tsx Race-Condition-Fix            | V85            |

---

*Generiert 2026-05-09 — ride2gether Security Audit Round 2*
