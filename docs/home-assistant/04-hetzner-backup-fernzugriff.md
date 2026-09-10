# Schritt 4: Hetzner für Backup und Fernzugriff

Der Hetzner-Server bekommt zwei klar umrissene Aufgaben:

1. **Off-Site-Backup** — verschlüsselte Sicherung, falls der Pi ausfällt, gestohlen wird
   oder brennt
2. **WireGuard-Einstiegspunkt** — Zugriff auf Home Assistant von unterwegs

**Home Assistant läuft dort nicht.** Der Server hält nur diese beiden Dienste.

---

## Vorbemerkung: Brauchst du Hetzner überhaupt?

Zwei ehrliche Alternativen, bevor du loslegst:

**Für den Fernzugriff:** Wenn dein Router WireGuard kann (FritzBox ab FRITZ!OS 7.39,
viele andere auch), ist das **einfacher** als der Umweg über Hetzner — ein Klick im
Router, QR-Code aufs Handy scannen, fertig. Kein Server, keine Wartung, keine Kosten.

**Für das Backup:** Eine **Hetzner Storage Box** (ab ca. 4 €/Monat für 1 TB) ist für
reines Backup günstiger und wartungsärmer als ein ganzer Server.

Wenn der Server ohnehin schon läuft und bezahlt ist, spricht nichts dagegen, ihn zu
nutzen. Nur extra dafür anschaffen würde ich ihn nicht.

---

## Teil 1: Verschlüsseltes Backup mit restic

`restic` verschlüsselt **auf dem Pi**, bevor irgendetwas übertragen wird. Auf dem Server
liegen nur unlesbare Daten — selbst wenn dort jemand Zugriff bekäme.

### 1.1 Vorbereitung auf dem Server

```bash
# auf dem Hetzner-Server
sudo adduser --disabled-password --gecos "" backup
sudo mkdir -p /home/backup/.ssh
sudo mkdir -p /srv/backup/homeassistant
sudo chown -R backup:backup /home/backup /srv/backup
```

### 1.2 SSH-Schlüssel vom Pi

```bash
# auf dem Pi
ssh-keygen -t ed25519 -f ~/.ssh/backup_hetzner -N ""
ssh-copy-id -i ~/.ssh/backup_hetzner.pub backup@<SERVER-IP>
ssh -i ~/.ssh/backup_hetzner backup@<SERVER-IP> "echo Verbindung ok"
```

### 1.3 restic einrichten

```bash
# auf dem Pi
sudo apt install -y restic

# Passwort erzeugen und sicher ablegen
openssl rand -base64 32 | sudo tee /root/.restic-password
sudo chmod 600 /root/.restic-password
```

> **Dieses Passwort jetzt sofort an einen zweiten Ort kopieren** — Passwortmanager,
> ausgedruckt im Ordner, was auch immer. Ohne dieses Passwort ist das Backup
> **unwiederbringlich verloren**. Es gibt keine Wiederherstellung, keinen Support,
> keinen Trick. Das ist der Preis für echte Verschlüsselung.
>
> Das ist der wichtigste Satz in dieser gesamten Doku.

Repository anlegen:

```bash
sudo restic -r sftp:backup@<SERVER-IP>:/srv/backup/homeassistant \
  --password-file /root/.restic-password init
```

### 1.4 Backup-Skript

Die fertige Fassung liegt unter [`stack/backup-homeassistant.sh`](stack/backup-homeassistant.sh).

```bash
sudo cp docs/home-assistant/stack/backup-homeassistant.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-homeassistant.sh
sudo nano /usr/local/bin/backup-homeassistant.sh   # SERVER-IP eintragen
sudo /usr/local/bin/backup-homeassistant.sh        # einmal von Hand testen
```

### 1.5 Automatisch jede Nacht

```bash
sudo tee /etc/systemd/system/ha-backup.service >/dev/null <<'EOF'
[Unit]
Description=Home Assistant Backup nach Hetzner
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/backup-homeassistant.sh
EOF

sudo tee /etc/systemd/system/ha-backup.timer >/dev/null <<'EOF'
[Unit]
Description=Taeglich Home Assistant sichern

[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ha-backup.timer
systemctl list-timers ha-backup.timer
```

`Persistent=true` sorgt dafür, dass ein verpasstes Backup (Pi war aus) beim nächsten
Start nachgeholt wird.

### 1.6 Wiederherstellung testen — nicht überspringen

Ein Backup, das nie zurückgespielt wurde, ist eine Vermutung, kein Backup.

```bash
# Was liegt im Repository?
sudo restic -r sftp:backup@<SERVER-IP>:/srv/backup/homeassistant \
  --password-file /root/.restic-password snapshots

# Testweise in ein leeres Verzeichnis zurückholen
sudo restic -r sftp:backup@<SERVER-IP>:/srv/backup/homeassistant \
  --password-file /root/.restic-password restore latest --target /tmp/restore-test

ls -la /tmp/restore-test/opt/homeassistant/config/
sudo rm -rf /tmp/restore-test
```

Trage dir einen Termin ein, das **einmal im Halbjahr** zu wiederholen.

---

## Teil 2: Fernzugriff über WireGuard

**Home Assistant wird nicht ins Internet gestellt.** Stattdessen baut dein Handy einen
verschlüsselten Tunnel auf und ist damit virtuell im Heimnetz.

Das ist deutlich sicherer als eine öffentlich erreichbare Anmeldeseite — es gibt schlicht
nichts, was jemand von außen angreifen könnte.

### Aufbau

```
   Handy  ──┐
            ├──►  Hetzner (WireGuard-Server, 10.9.0.1)
   Pi  ─────┘         ▲
   10.9.0.2           │
   leitet weiter ins Heimnetz 192.168.178.0/24
```

Der Pi hält den Tunnel dauerhaft offen und leitet Anfragen ins Heimnetz weiter. Das Handy
verbindet sich mit dem Server und erreicht darüber den Pi.

### 2.1 Schlüssel erzeugen

Auf **jedem** der drei Geräte (Server, Pi, Handy — beim Handy erledigt das die App):

```bash
wg genkey | tee privatekey | wg pubkey > publickey
```

### 2.2 Konfigurationen

Vorlagen liegen im Ordner [`wireguard/`](wireguard/):

| Datei | Wohin |
|---|---|
| `wg0-hetzner.conf.beispiel` | Hetzner: `/etc/wireguard/wg0.conf` |
| `wg0-pi.conf.beispiel` | Pi: `/etc/wireguard/wg0.conf` |
| `wg0-handy.conf.beispiel` | in die WireGuard-App übertragen |

Platzhalter in spitzen Klammern ersetzen. **Achtung:** In jede Konfiguration gehört der
**eigene private** Schlüssel und der **öffentliche** Schlüssel der Gegenstelle — nicht
verwechseln, das ist der häufigste Fehler.

### 2.3 Starten

```bash
# Server
sudo apt install -y wireguard
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-wg.conf
sudo systemctl enable --now wg-quick@wg0

# Firewall
sudo ufw allow 51820/udp
sudo ufw allow 22/tcp
sudo ufw enable
```

```bash
# Pi
sudo apt install -y wireguard
sudo systemctl enable --now wg-quick@wg0
sudo wg show           # unter "latest handshake" muss eine Zeit stehen
```

### 2.4 Auf dem Handy

WireGuard-App installieren (offiziell, quelloffen, kostenlos), Konfiguration eintragen
oder QR-Code scannen.

Test: **WLAN am Handy ausschalten** (echte Mobilfunkverbindung), WireGuard aktivieren,
dann `http://<PI-IP>:8123` aufrufen.

### 2.5 In der Home-Assistant-App

Unter **Einstellungen → Companion App → Server**:

- Interne Adresse: `http://<PI-IP>:8123`
- Externe Adresse: **dieselbe** `http://<PI-IP>:8123`

Das ist kein Fehler: Über WireGuard ist die interne Adresse auch von unterwegs die
richtige. Die App muss nicht umschalten.

Damit du nicht jedes Mal manuell den Tunnel startest, in der WireGuard-App **„On-Demand"**
(iOS) bzw. eine Ausnahme für dein Heim-WLAN (Android) aktivieren — dann verbindet sich
das Handy automatisch, sobald du außer Haus bist.

---

## Warum kein Nabu Casa Cloud?

Home Assistant bietet mit **Nabu Casa** einen bequemen bezahlten Fernzugriff (ca. 7,50 €
im Monat). Das ist ein gutes Produkt und unterstützt die Entwicklung des Projekts.

Für dich spricht dagegen: Der Datenverkehr läuft über Server des Anbieters, und ein Teil
der Infrastruktur liegt außerhalb der EU. Wenn dir das Vermeiden von Datenabflüssen
wichtig ist, ist WireGuard die konsequentere Wahl — und funktional gibt es kaum einen
Unterschied.

Der ehrliche Nachteil von WireGuard: Sprachassistenten-Anbindung und das komfortable
Einrichten von Cloud-Diensten fallen weg, und du musst den Tunnel selbst am Laufen halten.

---

## Checkliste Schritt 4

- [ ] restic-Repository angelegt
- [ ] **restic-Passwort an einem zweiten Ort gesichert** ← ohne das ist alles wertlos
- [ ] Backup läuft automatisch (Timer aktiv)
- [ ] Wiederherstellung **einmal getestet**
- [ ] WireGuard-Handshake zwischen Pi und Server steht
- [ ] Zugriff vom Handy über Mobilfunk funktioniert
- [ ] Home Assistant ist **nicht** direkt aus dem Internet erreichbar
