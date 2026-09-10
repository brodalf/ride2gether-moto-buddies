# Home Assistant auf dem Raspberry Pi 4

> Stand: 2026-09-10 · Zielsystem: Raspberry Pi 4 (4/8 GB) mit SSD · Hetzner-Server nur für Backup und Fernzugriff

Diese Doku beschreibt, wie Home Assistant zusammen mit **Pi-hole** und **MagicMirror**
auf einem Raspberry Pi 4 betrieben wird, und wie die vier vorhandenen Geräte angebunden werden.

---

## 1. Die Entscheidung: Pi statt Hetzner

Ursprünglich war ein Hetzner-Server als Standort angedacht. Davon wird abgeraten.

**Grund:** Zwei der vier Geräte sind nur im Heimnetz erreichbar. Ein Server im Rechenzentrum
kommt an den Fernseher und die WLAN-Steckdose nicht heran. Man bräuchte zusätzlich einen
WireGuard-Tunnel **plus** ein Gateway zu Hause **plus** manuelles Routing — also ungefähr
doppelt so viel Technik für dasselbe Ergebnis.

| Gerät | Anbindung | Braucht Heimnetz? |
|---|---|---|
| Hisense 55E7NQ PRO | lokal, MQTT Port 36669 | **ja, zwingend** |
| Bearware 306911 (Tuya) | lokal (empfohlen) oder Cloud | **ja** (bei lokal) |
| Bosch SMU4EUS00D | Home-Connect-Cloud (OAuth) | nein |
| Ecovacs Deebot X11 Pro Omni | Ecovacs-Cloud | nein |

Der Pi steht bereits im richtigen Netz. Damit fällt die halbe Komplexität weg.

**Rollenverteilung:**

- **Raspberry Pi 4 (zu Hause):** Home Assistant, Pi-hole, MagicMirror
- **Hetzner-Server:** verschlüsseltes Off-Site-Backup + WireGuard-Einstiegspunkt von unterwegs
- **Kein** Home Assistant auf Hetzner

---

## 2. Die zwei echten Risiken

Bitte vorab lesen — beide sind vermeidbar, aber nur, wenn man sie kennt.

### Risiko 1: Die SD-Karte

Home Assistant schreibt permanent in seine Datenbank (jede Sensoränderung). SD-Karten
sterben daran typischerweise nach Monaten bis etwa zwei Jahren. Dann ist alles gleichzeitig
weg: Smart Home, Spiegel — und der DNS für den ganzen Haushalt.

→ **Boot von SSD ist Voraussetzung, keine Optimierung.** Siehe [01-pi-vorbereiten.md](01-pi-vorbereiten.md).

### Risiko 2: Pi-hole ist DNS für alle

Wenn der Pi wegen eines Home-Assistant-Updates hängt, „ist das Internet kaputt" — sofort,
für alle im Haushalt. Das erzeugt unnötigen Druck bei jeder Wartung.

→ **Im Router einen zweiten DNS-Server eintragen** (z. B. den Router selbst als Fallback).
Dann fällt ein Pi-Ausfall im Alltag gar nicht mehr auf.

---

## 3. Ressourcen: passt das auf einen Pi 4?

| Dienst | RAM (grob) | Last |
|---|---|---|
| Raspberry Pi OS (Desktop, für MagicMirror) | ~350 MB | niedrig |
| Pi-hole | ~100 MB | vernachlässigbar |
| MagicMirror (Chromium, 24/7) | ~700 MB | dauerhaft mittel |
| Home Assistant | ~800 MB – 1,2 GB | schubweise |
| **Summe** | **~2,0 – 2,4 GB** | |

- **8 GB Pi 4:** entspannt, keine Einschränkungen.
- **4 GB Pi 4:** funktioniert, aber ohne Puffer. Recorder-Tuning aus
  [02-docker-stack.md](02-docker-stack.md) bitte anwenden, sonst wächst die Datenbank
  unnötig und der RAM wird knapp.

Der Engpass ist realistisch nicht die CPU, sondern RAM und Schreiblast.

---

## 4. Reihenfolge

Einer nach dem anderen. Nach jedem Schritt prüfen, ob Pi-hole und MagicMirror noch laufen.

| # | Schritt | Datei | Dauer |
|---|---|---|---|
| 1 | Pi auf SSD umziehen, Ports prüfen, DNS-Fallback | [01-pi-vorbereiten.md](01-pi-vorbereiten.md) | ~1–2 h |
| 2 | Docker-Stack + Home Assistant installieren | [02-docker-stack.md](02-docker-stack.md) | ~45 min |
| 3 | Geräte anbinden (einzeln!) | [03-geraete-uebersicht.md](03-geraete-uebersicht.md) | je 15–60 min |
| 4 | Backup + Fernzugriff über Hetzner | [04-hetzner-backup-fernzugriff.md](04-hetzner-backup-fernzugriff.md) | ~1 h |
| 5 | Datenflüsse / DSGVO bewerten | [05-dsgvo-datenfluesse.md](05-dsgvo-datenfluesse.md) | lesen |
| 6 | Betrieb, Wartung, Fehlersuche | [06-betrieb-und-troubleshooting.md](06-betrieb-und-troubleshooting.md) | Nachschlagewerk |

Optional, unabhängig davon:
[anhang-retro-gaming.md](anhang-retro-gaming.md) — wie sich der freie Platz auf der SSD
als ROM-Speicher für N64-Emulation nutzen lässt, **ohne** die Stabilität des Pi zu
gefährden.

**Wichtig:** Schritt 3 nicht an einem Stück durchziehen. Jedes Gerät einzeln anbinden und
testen. Wenn etwas nicht geht, weiß man dann auch, was.

---

## 5. Was in diesem Ordner liegt

```
docs/home-assistant/
├── README.md                          ← diese Datei
├── 01-pi-vorbereiten.md               SSD-Boot, Ports, DNS-Fallback
├── 02-docker-stack.md                 Docker Compose, HA-Grundkonfiguration
├── 03-geraete-uebersicht.md           Entscheidungstabelle aller vier Geräte
├── 04-hetzner-backup-fernzugriff.md   restic + WireGuard
├── 05-dsgvo-datenfluesse.md           Wohin welche Daten fließen
├── 06-betrieb-und-troubleshooting.md  Wartung + Fehlersuche
├── anhang-retro-gaming.md             optional: SSD-Platz fuer N64-Emulation
├── geraete/
│   ├── hisense-55e7nq-pro.md
│   ├── bosch-smu4eus00d.md
│   ├── ecovacs-deebot-x11.md
│   └── bearware-306911.md
├── stack/                             fertige Konfigurationsdateien
└── wireguard/                         WireGuard-Vorlagen
```

---

## 6. Ehrliche Einordnung vorab

Drei Punkte, die erfahrungsgemäß Frust erzeugen, wenn man sie nicht vorher weiß:

1. **Der Hisense-Fernseher ist der unsicherste Kandidat.** Es gibt keine offizielle
   Home-Assistant-Integration, nur eine Community-Lösung. Ob sie mit genau diesem
   Modell/Firmwarestand funktioniert, lässt sich vorher nicht garantieren. Es gibt aber
   einen zuverlässigen Plan B (siehe Gerätedatei).
2. **Beim Bosch-Geschirrspüler ist zuerst zu klären, ob er überhaupt WLAN hat.**
   Ohne Home-Connect-Modul geht die offizielle Anbindung nicht — auch dafür gibt es
   einen brauchbaren Umweg.
3. **Der Ecovacs X11 ist ein sehr neues Modell.** Die Home-Assistant-Integration hinkt bei
   neuen Modellen oft ein paar Monate hinterher. Grundfunktionen laufen meist,
   Spezialfunktionen unter Umständen nicht.

Details und Alternativen jeweils in `geraete/`.
