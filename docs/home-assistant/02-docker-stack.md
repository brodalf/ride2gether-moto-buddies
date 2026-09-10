# Schritt 2: Home Assistant installieren

Home Assistant läuft als Docker-Container neben Pi-hole und MagicMirror.

---

## 2.1 Welche Variante? (kurz erklärt)

Home Assistant gibt es in mehreren Ausführungen. Für diesen Fall ist die Wahl eindeutig:

| Variante | Für dich geeignet? |
|---|---|
| **Home Assistant Container** (Docker) | **Ja — diese nehmen wir** |
| Home Assistant OS | Nein: übernimmt den ganzen Pi, Pi-hole und MagicMirror müssten weichen |
| Home Assistant Supervised | Nein: verlangt ein exklusives, unverändertes Debian |
| Home Assistant Core (pip) | Nein: Python-Abhängigkeiten kollidieren erfahrungsgemäß |

**Ehrlicher Nachteil der Container-Variante:** Es gibt **keinen Add-on-Store**.
Dinge wie Mosquitto oder Zigbee2MQTT installierst du als eigene Docker-Container statt
per Klick. Für dieses Setup ist das kaum relevant — die vier Geräte brauchen keine Add-ons.

---

## 2.2 Verzeichnisse anlegen

```bash
sudo mkdir -p /opt/homeassistant/{config,mosquitto/config,mosquitto/data,mosquitto/log}
sudo chown -R $USER:$USER /opt/homeassistant
cd /opt/homeassistant
```

---

## 2.3 docker-compose.yml

Die fertige Datei liegt unter [`stack/docker-compose.yml`](stack/docker-compose.yml).
Auf den Pi kopieren nach `/opt/homeassistant/docker-compose.yml`.

Zwei Dinge daran sind wichtig zu verstehen:

**`network_mode: host`** — Der Container teilt sich das Netzwerk direkt mit dem Pi.
Das ist notwendig, damit Home Assistant Geräte im Heimnetz automatisch findet
(mDNS/SSDP für Fernseher und Steckdose). Mit dem normalen Docker-Netzwerk würde die
Gerätesuche nicht funktionieren.

**`TZ=Europe/Berlin`** — Ohne Zeitzone laufen alle Zeitautomatisierungen um zwei Stunden
falsch. Ein klassischer Fehler, der erst Wochen später auffällt.

Starten:

```bash
cd /opt/homeassistant
docker compose up -d
docker compose logs -f homeassistant     # mit Strg+C beenden
```

Der erste Start dauert 2–5 Minuten. Danach erreichbar unter:

```
http://<PI-IP>:8123
```

Dort ein Benutzerkonto anlegen. **Bitte ein starkes Passwort** — auch wenn das System
zunächst nur im Heimnetz erreichbar ist.

Direkt danach in **Profil → Sicherheit → Zwei-Faktor-Authentifizierung** aktivieren.
Das dauert zwei Minuten und du hast es später nicht mehr auf dem Schirm.

---

## 2.4 Grundkonfiguration (wichtig bei 4 GB RAM)

Home Assistant speichert standardmäßig **10 Tage** jeden einzelnen Sensorwert. Auf einem
Pi 4 wird die Datenbank dadurch schnell mehrere Gigabyte groß, was RAM und SSD unnötig
belastet.

Die Datei [`stack/configuration.yaml.beispiel`](stack/configuration.yaml.beispiel)
enthält eine angepasste Konfiguration. Die entscheidenden Teile:

```yaml
recorder:
  purge_keep_days: 5          # statt 10 — reicht für den Alltag völlig
  commit_interval: 30         # seltener schreiben = SSD wird geschont
  exclude:
    domains:
      - automation
      - updater
    entity_globs:
      - sensor.sun_*          # ändert sich permanent, interessiert niemanden
      - sensor.*_uptime

logbook:
  exclude:
    domains:
      - automation
```

Bei **8 GB RAM** kannst du `purge_keep_days` auch auf 10 lassen. Bei **4 GB** bitte
bei 5 bleiben.

Danach:

```bash
docker compose restart homeassistant
```

### Langzeitdaten gehen dabei nicht verloren

Häufige Sorge: „Dann sind meine Statistiken nach 5 Tagen weg." Nein. Home Assistant führt
zusätzlich zur Detail-Datenbank sogenannte **Langzeitstatistiken** (Stunden-/Tageswerte
für Energie, Temperatur usw.). Die bleiben **unbegrenzt** erhalten. `purge_keep_days`
betrifft nur die sekundengenaue Historie.

---

## 2.5 Reverse Proxy vorbereiten — nein

Auf dem Pi läuft **kein** Reverse Proxy (siehe Schritt 1.5, Port 80 gehört Pi-hole).

Trage trotzdem schon jetzt die WireGuard-Netze als vertrauenswürdig ein, damit der
Fernzugriff später ohne weiteres Nachjustieren funktioniert — das ist bereits in der
Beispielkonfiguration enthalten:

```yaml
http:
  use_x_forwarded_for: true
  trusted_proxies:
    - 127.0.0.1
    - 10.9.0.0/24        # WireGuard-Netz, siehe Schritt 4
  ip_ban_enabled: true
  login_attempts_threshold: 5
```

`ip_ban_enabled` sperrt IP-Adressen nach fünf Fehlversuchen aus. Das kostet nichts und
schützt zuverlässig gegen einfaches Durchprobieren von Passwörtern.

---

## 2.6 Mosquitto — brauchst du wahrscheinlich nicht

Der MQTT-Broker Mosquitto ist in der `docker-compose.yml` enthalten, aber
**auskommentiert**.

Ehrliche Einordnung: Der Hisense-Fernseher bringt seinen **eigenen** MQTT-Broker mit
(Port 36669) — Home Assistant verbindet sich dorthin. Ein zusätzlicher eigener Broker ist
dafür **nicht** nötig. Auch die anderen drei Geräte brauchen keinen.

Aktiviere Mosquitto also erst, wenn du ihn wirklich brauchst — etwa wenn später
Zigbee-Geräte, ESPHome-Sensoren oder ein eigener Bastelsensor dazukommen. Bis dahin
wäre er nur ein Dienst mehr, der Speicher belegt und gewartet werden will.

---

## 2.7 HACS installieren (für den Fernseher nötig)

HACS ist ein Store für Community-Integrationen. Du brauchst ihn für den Hisense-Fernseher,
sonst für nichts in diesem Setup.

```bash
docker compose exec homeassistant bash -c \
  "wget -O - https://get.hacs.xyz | bash -"
docker compose restart homeassistant
```

Danach in Home Assistant:
**Einstellungen → Geräte & Dienste → Integration hinzufügen → HACS**.
Es folgt eine GitHub-Anmeldung per Gerätecode.

**Sicherheitshinweis, ohne Panikmache:** HACS-Integrationen sind Code von Privatpersonen,
der mit vollen Rechten in Home Assistant läuft und nicht von Home Assistant geprüft wird.
Installiere daraus nur, was du wirklich brauchst, und bevorzugt Projekte mit vielen Sternen
und aktuellen Commits. Für dieses Setup ist genau **eine** HACS-Integration vorgesehen.

---

## Checkliste Schritt 2

- [ ] `http://<PI-IP>:8123` erreichbar, Konto angelegt
- [ ] Zwei-Faktor-Authentifizierung aktiv
- [ ] `configuration.yaml` mit Recorder-Tuning übernommen
- [ ] `free -h` zeigt noch mindestens ~500 MB frei
- [ ] Pi-hole und MagicMirror laufen weiterhin
- [ ] HACS installiert (nur falls der Fernseher angebunden werden soll)

Weiter zu [Schritt 3: Geräte](03-geraete-uebersicht.md).
