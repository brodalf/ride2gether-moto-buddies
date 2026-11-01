# Security-Audit — ride2gether-moto-buddies (2026-11-01)

**Typ:** Monatlicher Folge-Audit (automatisiert, Kurzreport)
**Basis:** `origin/main` @ `bfc37b8` (letzter Commit 2026-07-17)

## Ergebnis

Keine Code-Änderungen seit dem letzten Audit (`security/audit-2026-09-01`, Basis `bfc37b8`). Vorherige Findings gelten unverändert. Hinweis: Die Reports vom 08-31 und 09-01 liegen nur auf eigenen Branches und sind nicht in `main`. In `main` liegt als neuester Report nur `SECURITY-AUDIT-2026-05-09-R2.md`. Empfehlung: die Audit-Branches per PR mergen.

Stichproben gegen `main` (Re-Check, kein Deep-Scan):
- Kein `sb_secret_*`/service_role-Key im Working Tree. Der Gesamtverlauf wurde nicht durchsucht.
- `dangerouslySetInnerHTML` nur in `src/components/ui/chart.tsx` (shadcn-Standard, Farbwerte aus Entwickler-Config, kein User-Input) → unkritisch.
- Alle SECURITY-DEFINER-Funktionen (`sql/01`–`06`) prüfen `auth.uid()`; RLS auf allen Tabellen aktiv.
- `.env` ist getrackt, enthält aber nur URL + `sb_publishable_*` (Anon-Key, öffentlich by design). INFO: `.env` in `.gitignore` aufnehmen und nur `.env.example` tracken.

## Offene Punkte

| Punkt | Severity | Status |
|---|---|---|
| `npm audit --omit=dev`: 11 Advisories (5 high, 6 moderate): brace-expansion, nanoid, postcss, source-map-js, zod (<4.6.6, Memory-DoS, Fix nur per Major-Update 4.6.7), glob, minimatch, postcss-selector-parser, sucrase, react-router / react-router-dom (Open-Redirect-Bypass GHSA-wrjc-x8rr-h8h6, Constructor-Injection GHSA-337j-9hxr-rhxg) | HIGH (DoS/ReDoS-Klasse, überwiegend Build-Tool-Abhängigkeiten) + MEDIUM (react-router) | NEU seit 09-01 durch neue Advisories, kein Code-Change. `npm audit fix` für alle außer zod möglich; react-router-Update empfohlen. Nicht automatisch angewendet (Lockfile-Änderung ohne Build-Test). |
| CSP `script-src 'unsafe-inline'` (V43b) | MEDIUM | offen (Defense-in-Depth) |
| vite/esbuild Dev-Server-Advisory (Q2) | LOW | offen, nur lokale Entwicklung |
| Entscheidungen Q1 (GPS-Fuzz) / Q2 aus R2 | – | Q1 umgesetzt (2 Dezimalstellen) |

**Severity-Zähler:** CRITICAL 0 · HIGH 1 (npm-Dependencies, gebündelt) · MEDIUM 2 · LOW/INFO 2
