# Betrieb, Wartung und Fehlersuche

Nachschlagewerk. Nicht am Stück lesen.

---

## 1. Wartung: was, wann, wie lange

| Was | Wie oft | Dauer |
|---|---|---|
| Home Assistant aktualisieren | alle 1–2 Monate | 10 Min |
| Betriebssystem aktualisieren | monatlich | 5 Min |
| Backup-Wiederherstellung testen | halbjährlich | 20 Min |
| Speicherplatz und RAM prüfen | monatlich | 2 Min |

Mehr braucht es nicht. Wer jedes Update sofort einspielt, hat mehr Arbeit und mehr
Ärger, nicht weniger.

### Home Assistant aktualisieren

```bash
cd /opt/homeassistant
docker compose pull
docker compose up -d
docker compose logs -f homeassistant     # 2 Minuten zuschauen, Strg+C
```

**Vor jedem Update:** Kurz in die
[Release Notes](https://www.home-assistant.io/blog/categories/core/) schauen — Abschnitt
**„Breaking Changes"**. Home Assistant ändert regelmäßig Dinge, die dann Konfiguration
kaputtmachen.

Am ruhigsten fährt, wer **die erste Version eines Monats überspringt** und erst die
`.1`- oder `.2`-Version einspielt. Dann haben andere die Probleme schon gefunden.

### Zurück auf die Vorversion

Wenn ein Update etwas kaputt macht:

```bash
cd /opt/homeassistant
docker compose down
# in docker-compose.yml die Zeile "image:" auf eine feste Version aendern, z.B.:
#   image: ghcr.io/home-assistant/home-assistant:2026.8.3
docker compose up -d
```

**Wichtig:** Home Assistant migriert seine Datenbank beim Update. Ein Rückschritt
funktioniert deshalb **nur mit dem Backup von vorher**. Deswegen läuft das Backup
nachts automatisch (Schritt 4).

---

## 2. Gesundheitscheck (monatlich, 2 Minuten)

```bash
# RAM: wieviel ist noch frei?
free -h

# Platte: unter 80% halten
df -h /

# Wie gross ist die Home-Assistant-Datenbank?
du -h /opt/homeassistant/config/home-assistant_v2.db

# Fehler der letzten Zeit
cd /opt/homeassistant && docker compose logs --tail=200 homeassistant | grep -i error

# Laeuft das Backup?
systemctl list-timers ha-backup.timer
sudo journalctl -u ha-backup.service --since "7 days ago" | tail -20
```

**Richtwerte für den Pi 4:**

| Wert | gut | Handlungsbedarf |
|---|---|---|
| Freier RAM | > 500 MB | < 200 MB |
| Festplatte belegt | < 80 % | > 90 % |
| Datenbankgröße | < 1 GB | > 2 GB |

Datenbank zu groß? → `purge_keep_days` in der `configuration.yaml` reduzieren, dann:

```yaml
# Entwicklerwerkzeuge -> Aktionen -> recorder.purge
keep_days: 3
repack: true
```

`repack: true` gibt den Speicherplatz tatsächlich frei (dauert einige Minuten).

---

## 3. Typische Probleme

### Home Assistant startet nicht mehr

```bash
cd /opt/homeassistant
docker compose logs --tail=100 homeassistant
```

Meist steht der Grund in den letzten 20 Zeilen. Häufigste Ursachen:

| Meldung enthält | Ursache | Lösung |
|---|---|---|
| `Invalid config` | YAML-Fehler | Einrückung prüfen (nur Leerzeichen, keine Tabs) |
| `Address already in use` | Port 8123 belegt | `sudo ss -tulpn \| grep 8123` |
| `database is locked` | Datenbank beschädigt | siehe unten |
| `Integration not found` | HACS-Integration fehlt | HACS-Integration neu installieren |

### Datenbank beschädigt

Passiert typischerweise nach einem Stromausfall.

```bash
cd /opt/homeassistant
docker compose stop homeassistant
mv config/home-assistant_v2.db config/home-assistant_v2.db.kaputt
docker compose start homeassistant
```

Home Assistant legt eine neue Datenbank an. **Die Historie ist dann weg**, die
Konfiguration und alle Geräte bleiben erhalten. Das ist meist der schnellste Weg — eine
beschädigte SQLite-Datei zu reparieren lohnt selten.

Wenn das öfter vorkommt: Die SSD oder das Netzteil sind verdächtig. Der Pi 4 braucht
ein Netzteil mit **3 A**; ein zu schwaches Netzteil ist eine erstaunlich häufige Ursache
für scheinbar zufällige Fehler.

### Der Pi wird langsam, MagicMirror ruckelt

Reihenfolge zum Prüfen:

```bash
free -h                    # RAM knapp?
uptime                     # Load ueber 4,0 ist zu hoch
docker stats --no-stream   # welcher Container zieht?
vcgencmd measure_temp      # ueber 80 Grad -> Drosselung
vcgencmd get_throttled     # nicht 0x0 -> Strom- oder Hitzeproblem
```

Gegenmaßnahmen in dieser Reihenfolge:

1. `purge_keep_days` auf 3 reduzieren
2. Weitere Entitäten in `recorder.exclude` aufnehmen
3. RAM-Limit in der `docker-compose.yml` prüfen
4. Kühlkörper oder Lüfter nachrüsten (bei `get_throttled != 0x0`)

### Ein Gerät ist plötzlich „nicht verfügbar"

Fast immer eine geänderte IP-Adresse.

```bash
ping -c3 <GERAETE-IP>
```

Keine Antwort? → Im Router nachsehen, welche IP das Gerät jetzt hat, und dort eine
**feste** Adresse zuweisen (siehe Schritt 1.5).

### Fernzugriff geht nicht

```bash
# Auf dem Pi: steht der Tunnel?
sudo wg show
# "latest handshake" muss eine Zeit unter 3 Minuten zeigen
```

| Symptom | Ursache |
|---|---|
| Kein Handshake | Firewall auf dem Server (Port 51820/udp?) |
| Handshake ok, HA nicht erreichbar | `AllowedIPs` beim Handy prüfen (Heimnetz dabei?) |
| Nur im WLAN erreichbar | Tunnel am Handy nicht aktiv |
| Funktioniert, dann nicht mehr | `PersistentKeepalive = 25` fehlt |

---

## 4. Wenn der Pi komplett ausfällt

Der Ablauf, falls SSD oder Pi kaputtgehen:

1. **Sofort:** Im Router den DNS umstellen (Pi-hole raus), damit das Internet im
   Haushalt wieder läuft. Das nimmt den Zeitdruck raus.
2. Neuen Pi/SSD aufsetzen: Schritt 1 und 2 dieser Doku
3. Backup zurückspielen:
   ```bash
   sudo restic -r sftp:backup@<SERVER-IP>:/srv/backup/homeassistant \
     --password-file /root/.restic-password \
     restore latest --target /
   cd /opt/homeassistant && docker compose up -d
   ```
4. Pi-hole neu installieren, DNS im Router zurückstellen
5. MagicMirror neu einrichten

**Realistischer Zeitbedarf: ein halber Tag.** Die Cloud-Geräte (Saugroboter,
Geschirrspüler) verbinden sich nach dem Zurückspielen von selbst wieder. Bei LocalTuya
und dem Fernseher kann eine erneute Anmeldung nötig sein.

---

## 5. Nützliche Befehle auf einen Blick

```bash
cd /opt/homeassistant

docker compose restart homeassistant        # neu starten
docker compose logs -f homeassistant        # live mitlesen
docker compose logs --tail=100 homeassistant | grep -i error
docker compose exec homeassistant bash      # in den Container

# Konfiguration pruefen, OHNE neu zu starten:
docker compose exec homeassistant \
  python -m homeassistant --script check_config -c /config

# Backup von Hand ausloesen
sudo /usr/local/bin/backup-homeassistant.sh

# WireGuard
sudo wg show
sudo systemctl restart wg-quick@wg0
```

Der `check_config`-Befehl ist der nützlichste davon: Damit prüfst du eine
Konfigurationsänderung, **bevor** du neu startest. Erspart die Situation, dass Home
Assistant nach einem Neustart wegen eines Tippfehlers gar nicht mehr hochkommt.

---

## 6. Wo du Hilfe bekommst

| Wo | Wofür |
|---|---|
| [community.home-assistant.io](https://community.home-assistant.io) | offizielles Forum, sehr aktiv |
| [r/homeassistant](https://reddit.com/r/homeassistant) | schnelle Antworten |
| GitHub-Issues der jeweiligen Integration | modellspezifische Probleme |
| `home-assistant.io/integrations/` | offizielle Doku je Integration |

Bei modellspezifischen Fragen (Hisense, Ecovacs X11) lohnt zuerst die Suche in den
**GitHub-Issues** der Integration — dort steht meist schon, ob dein Modell unterstützt
wird und woran es hakt.
