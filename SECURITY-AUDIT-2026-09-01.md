# Security-Audit — ride2gether-moto-buddies (2026-09-01)

**Typ:** Monatlicher Folge-Audit (automatisiert)
**Basis:** `origin/main` @ `bfc37b8` — unverändert seit dem letzten Ground-Truth-Audit
**Ergebnis:** Kein Deep-Scan nötig (kein neuer Commit seit letztem Audit)

---

## Fazit

Seit dem letzten inhaltlichen Audit (**Ground-Truth-Audit vom 2026-08-31**, Branch
`security/audit-2026-08-31`, Basis `bfc37b8`) sind **keine neuen Commits** auf `origin/main`
eingegangen. `origin/main` steht weiterhin exakt auf `bfc37b8` — demselben Commit, gegen den der
Audit vom 31.08. lief. Ein erneuter Deep-Scan wurde daher gemäß Runbook übersprungen; die Findings
aus dem 08-31-Report gelten unverändert fort.

**Hinweis:** Der Report vom 08-31 wurde auf Branch `security/audit-2026-08-31` erstellt, aber
bislang **nicht nach `main` gemergt** (keine zugehörige PR gefunden). Der vorliegende Report fasst
seinen Inhalt daher hier erneut zusammen und persistiert ihn zusätzlich direkt in der Historie.
Empfehlung: `security/audit-2026-08-31` per PR mergen oder schließen, damit `SECURITY-AUDIT-*.md`
im Repo-Root lückenlos bleibt.

---

## Bekannte offene Punkte (unverändert aus dem 08-31-Audit)

| Punkt | Severity | Begründung / Status |
|-------|----------|----------------------|
| CSP `script-src 'unsafe-inline'` (V43b) | MEDIUM (defense-in-depth) | Voller Fix braucht Vite-Nonce/Hash-Plugin + Build-Test; kein akuter Exploit, da React User-Input escaped |
| vite/esbuild Dev-Server-Advisory (Q2, GHSA-67mh-4wv8-2f99) | LOW (nur lokal) | Betrifft ausschließlich `vite dev` auf dem Entwicklerrechner, nicht die Vercel-Produktion |
| npm-audit Rest-Highs (brace-expansion, glob, lodash u.a.) | — | ReDoS/DoS-Klasse bzw. kein vorhandenes Nutzungsmuster → außerhalb Scope |

**Bereits verifiziert vorhanden in `main` (aus früheren Audits, weiterhin gültig):**
- V58: EXIF/GPS-Stripping bei Foto-Upload (`src/lib/supabase.ts`)
- V92: GPS-Fuzzing auf 2 Dezimalstellen (~1 km)
- V100: Hard-Cap auf RPC `p_limit` (matches ≤100, events ≤200)
- V29: CHECK-Constraint Nachrichtenlänge (1–2000)
- V83 / V83b: `join_event` FOR-UPDATE-Fix, RLS „Gruppe verlassen" blockt Creator-Bypass
- react-router Open-Redirect-Patch (`@remix-run/router` 1.23.3)
- V43: `unsafe-eval` aus CSP entfernt
- Kein `sb_secret_*`/service_role-Key jemals committet; alle SECURITY-DEFINER-Funktionen prüfen `auth.uid()`; RLS auf allen Tabellen aktiv

Kein akuter Handlungsbedarf im Code. Nächster inhaltlicher Deep-Scan greift automatisch, sobald
neue Commits auf `origin/main` landen.

---

*Erstellt am 2026-09-01 — automatischer monatlicher Folge-Audit, kein Deep-Scan (keine neuen Commits).*
