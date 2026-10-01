# Security-Audit — ride2gether-moto-buddies (2026-10-01)

**Typ:** Monatlicher Folge-Audit (automatisiert), kein Deep-Scan
**Basis:** `origin/main` @ `bfc37b8` (letzter Commit 2026-07-17)

## Fazit

Keine Code-Änderungen seit dem letzten Audit (2026-09-01, Basis `bfc37b8`); vorherige Findings gelten unverändert.

## Bekannte offene Punkte

| Punkt | Severity | Status |
|-------|----------|--------|
| CSP `script-src 'unsafe-inline'` (V43b) | MEDIUM (defense-in-depth) | offen, braucht Nonce/Hash-Plugin |
| vite/esbuild Dev-Server-Advisory (GHSA-67mh-4wv8-2f99) | LOW (nur lokal) | offen, Fix = vite@8 (Breaking) |
| npm-audit Rest-Highs (brace-expansion, glob, lodash) | — | ReDoS/DoS-Klasse, außerhalb Scope |

## Prozess-Hinweis

Die Audit-Branches `security/audit-2026-08-31` und `security/audit-2026-09-01` sind nicht nach `main` gemergt; `SECURITY-AUDIT-*.md` im Root von main enthält nur die Reports vom 2026-05-09. Empfehlung: Reports per PR mergen.
