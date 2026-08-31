# Security-Audit — ride2gether-moto-buddies (2026-08-31)

**Typ:** Definitiver Ground-Truth-Audit des gesamten Codestands
**Basis:** `origin/main` @ `bfc37b8` (kanonischer, von Vercel deployter Stand)
**Zweck:** Ersetzt die 7 nicht-persistierten Auto-Läufe (Jul–Aug 2026) durch eine belastbare Referenz.

---

## Fazit

**`origin/main` ist sauber.** Keine neuen, konkret ausnutzbaren Findings (>0.8 Confidence). Alle in
früheren Audits behobenen Punkte sind im deployten Stand vorhanden und verifiziert. Es besteht
**kein Code-Handlungsbedarf** – nur ein Prozess-Hinweis (siehe unten).

---

## Meta-Erkenntnis: Ursache der widersprüchlichen Auto-Läufe

Es existieren im Repo zwei Refs mit stark unterschiedlichem Sicherheitsstand:

| Ref | Stand | Security-Fixes |
|-----|-------|----------------|
| `origin/main` (`bfc37b8`) | aktuell, **deployt** | ✅ alle vorhanden |
| `claude/supabase-dating-app-setup-7wdfO` (`ec48697`) | veralteter Vorfahr | ❌ keine |

Der Entwicklungs-Branch `claude/…-7wdfO` ist ein **direkter Vorfahr** von `main` und enthält noch
KEINEN der Security-Fixes. Auto-Läufe, die zufällig diesen Branch prüften, meldeten „alles offen";
Läufe gegen `main` meldeten „alles gepatcht". Daher die scheinbaren Widersprüche.

**Annahme:** Vercel deployt von `main` → **Produktion ist abgesichert.** Der veraltete Branch ist
nur ein Risiko, falls versehentlich von dort deployt oder als Merge-Basis genutzt wird.

---

## Verifizierte Fixes (in `origin/main` vorhanden)

| ID | Fix | Fundstelle |
|----|-----|-----------|
| V58 | EXIF/GPS-Stripping bei Foto-Upload (Canvas-Roundtrip, fail-closed) | `src/lib/supabase.ts:115` |
| V92 | GPS-Fuzzing auf 2 Dezimalstellen (~1 km) | `sql/03_SECURITY_HARDENING_R2.sql:25` |
| V100 | Hard-Cap auf RPC `p_limit` (matches ≤100, events ≤200) | `sql/03_…:65,122` |
| V29 | CHECK-Constraint Nachrichtenlänge (1–2000) | `sql/03_…:155` |
| V83 | `join_event` FOR-UPDATE ohne GROUP BY | `sql/03_…:188` |
| V83b | RLS „Gruppe verlassen" blockt Creator-Bypass | `sql/03_…:211` |
| — | react-router Open-Redirect-Patch (`@remix-run/router` 1.23.3) | `package-lock.json` |
| V43 | `unsafe-eval` aus CSP entfernt + `base-uri`/`form-action`/`object-src` | `vercel.json:32` |

**Weiter geprüft und in Ordnung:**
- Alle SECURITY-DEFINER-SQL-Funktionen prüfen `auth.uid()` bzw. Gruppen-/Match-Mitgliedschaft.
- Alle Tabellen haben RLS aktiv; INSERT-Policies haben `WITH CHECK`.
- **Kein** `sb_secret_*`/service_role-Key jemals committet (auch nicht in `.env`-History) – nur der
  design-bedingt öffentliche `sb_publishable_*`-Key.
- Storage-Pfade sind userId-isoliert (`${userId}/${type}_…`).
- Kein `eval`, kein user-gesteuertes `dangerouslySetInnerHTML`, keine hartcodierten Secrets in `src/`.

---

## Bekannte offene Punkte (bewusst akzeptiert)

| Punkt | Severity | Begründung |
|-------|----------|-----------|
| CSP `script-src 'unsafe-inline'` (V43b) | MEDIUM (defense-in-depth) | Voller Fix braucht Vite-Nonce/Hash-Plugin + Build-Test; kein akuter Exploit, da React user-Input escaped |
| vite/esbuild Dev-Server-Advisory (Q2) | LOW (nur lokal) | Betrifft ausschließlich `vite dev` auf dem Entwicklerrechner, nicht die Vercel-Produktion |
| npm-audit Rest-Highs (brace-expansion, glob, lodash u.a.) | — | ReDoS/DoS bzw. erfordern nicht vorhandene Nutzungsmuster → außerhalb Scope (kein DoS, nur konkret ausnutzbar) |

---

## Empfehlung (Prozess, nicht Code)

Sicherstellen, dass ausschließlich `origin/main` deployt und weiterentwickelt wird. Den veralteten
Branch `claude/supabase-dating-app-setup-7wdfO` (`ec48697`) **nicht** als Basis für neue Arbeit
verwenden – er würde alle Security-Fixes zurückrollen. Bei Bedarf löschen oder auf `main` neu basen.

---

*Erstellt am 2026-08-31. Automatischer Folge-Audit läuft monatlich (1. des Monats).*
