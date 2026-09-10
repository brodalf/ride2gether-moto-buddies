# Schritt 1: Raspberry Pi 4 vorbereiten

Ziel: Der Pi bootet von SSD, Pi-hole und MagicMirror laufen unverändert weiter,
und es ist Platz für Home Assistant.

**Vorher:** Sichere dir die aktuelle SD-Karte einmal komplett (`dd` oder Win32DiskImager),
bevor du irgendetwas änderst. Wenn etwas schiefgeht, steckst du einfach die alte Karte
wieder rein und alles ist wie vorher.

---

## 1.1 Bestandsaufnahme

Erst gucken, dann anfassen. Diese Befehle auf dem Pi ausführen:

```bash
# Welches Modell, wie viel RAM?
cat /proc/device-tree/model; echo
free -h

# Läuft das System auf SD-Karte oder SSD?
lsblk -o NAME,SIZE,TRAN,MOUNTPOINT
#   TRAN = "usb"  -> SSD (gut)
#   Gerät heißt mmcblk0 -> SD-Karte (umziehen!)

# Welche Dienste belegen welche Ports?
sudo ss -tulpn | grep -E ':(53|80|443|8080|8123|1883) '

# Wie voll ist die Platte?
df -h /
```

Notiere dir das Ergebnis. Besonders die Portliste brauchst du gleich.

---

## 1.2 Auf SSD umziehen (der wichtigste Schritt)

Der Pi 4 kann direkt von USB booten, sobald der Bootloader aktuell ist.

**a) Bootloader aktualisieren**

```bash
sudo apt update && sudo apt full-upgrade -y
sudo rpi-eeprom-update -a
sudo reboot
```

**b) Bootreihenfolge auf USB stellen**

```bash
sudo raspi-config
#   -> 6 Advanced Options
#   -> Boot Order
#   -> USB Boot
```

**c) System auf die SSD kopieren**

Am einfachsten mit dem **SD Card Copier** (im Desktop-Menü unter „Zubehör"):
Quelle = SD-Karte, Ziel = SSD, Häkchen bei „New Partition UUIDs".
Danach Pi herunterfahren, **SD-Karte entfernen**, SSD anstecken, einschalten.

**d) Prüfen**

```bash
lsblk -o NAME,SIZE,TRAN,MOUNTPOINT   # root muss jetzt auf dem USB-Gerät liegen
```

### Bekannte Stolperfalle: USB-SATA-Adapter

Manche USB-SATA-Adapter (verbreitet bei JMicron- und ASMedia-Chips) vertragen sich nicht
mit dem UAS-Treiber. Symptom: Der Pi bootet nicht oder friert unter Last ein — was sich
leicht mit „SSD kaputt" verwechseln lässt.

Falls das auftritt: Chip-ID auslesen und UAS für dieses Gerät abschalten.

```bash
lsusb            # z. B. "152d:0578 JMicron"
sudo nano /boot/firmware/cmdline.txt
# ganz vorne in der EINEN Zeile ergänzen (nichts umbrechen!):
#   usb-storage.quirks=152d:0578:u
sudo reboot
```

NVMe über einen HAT ist unauffälliger als USB-SATA, aber USB-SSD reicht für dieses Setup.

---

## 1.3 DNS-Fallback im Router eintragen

Damit ein Pi-Ausfall nicht das ganze Haus lahmlegt.

1. Router öffnen (FritzBox: `http://fritz.box`)
2. **Heimnetz → Netzwerk → Netzwerkeinstellungen → IPv4-Einstellungen**
3. Beim DHCP-Server als **primären DNS** die IP des Pi eintragen
4. Als **sekundären DNS** die IP des Routers selbst (oder einen DNS deiner Wahl)

Ehrlicher Hinweis: Ein sekundärer DNS bedeutet, dass gelegentlich Anfragen am Pi-hole
vorbeilaufen und dann nicht gefiltert werden. Das ist ein bewusster Tausch:
etwas weniger Werbefilterung gegen deutlich weniger Stress bei Wartung und Ausfall.
Für ein System, das die ganze Wohnung versorgt, ist dieser Tausch die richtige Wahl.

---

## 1.4 Feste IP für den Pi

Home Assistant und Pi-hole brauchen eine IP, die sich nicht ändert.

Am saubersten im Router: **Heimnetz → Netzwerk → Pi anklicken →
„Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen"**.

Das ist besser als eine statische IP direkt auf dem Pi zu konfigurieren, weil der Router
die Adresse dann kennt und nicht doppelt vergibt.

Notiere dir die IP, z. B. `192.168.178.20`. Sie taucht im Rest der Doku als
`<PI-IP>` auf.

---

## 1.5 Ports: wer belegt was?

| Dienst | Port | Anmerkung |
|---|---|---|
| Pi-hole DNS | 53 (tcp/udp) | darf nichts anderes belegen |
| Pi-hole Weboberfläche | 80 | bleibt so |
| MagicMirror | 8080 | intern |
| **Home Assistant** | **8123** | neu, kein Konflikt |
| Mosquitto (optional) | 1883 | nur lokal |

**Es gibt im Standardfall keinen Konflikt.** Home Assistant nutzt 8123, das ist frei.

**Aber:** Installiere auf dem Pi **keinen** Reverse Proxy (Caddy, Nginx Proxy Manager,
Traefik). Der würde Port 80/443 belegen und damit die Pi-hole-Oberfläche verdrängen.
Der Fernzugriff läuft in diesem Setup über WireGuard — dafür ist kein Reverse Proxy nötig.
Siehe [04-hetzner-backup-fernzugriff.md](04-hetzner-backup-fernzugriff.md).

### Falls Port 53 belegt ist

Auf Raspberry Pi OS Bookworm kann `systemd-resolved` Port 53 blockieren und Pi-hole
stören:

```bash
sudo ss -tulpn | grep ':53 '
# zeigt systemd-resolved? Dann:
sudo mkdir -p /etc/systemd/resolved.conf.d
sudo tee /etc/systemd/resolved.conf.d/no-stub.conf >/dev/null <<'EOF'
[Resolve]
DNSStubListener=no
EOF
sudo systemctl restart systemd-resolved
```

---

## 1.6 Pi-hole nicht anfassen

Falls Pi-hole nativ (nicht in Docker) installiert ist: **so lassen.**

Es gibt keinen Grund, ein laufendes Pi-hole zu dockerisieren. Das erzeugt nur
Port-53-Konflikte und Risiko ohne Gegenwert. Home Assistant kommt als zusätzlicher
Docker-Container daneben — die beiden stören sich nicht.

Dasselbe gilt für MagicMirror: läuft weiter wie bisher (pm2 oder systemd).

---

## 1.7 Docker installieren

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# einmal ab- und wieder anmelden, danach:
docker run --rm hello-world
```

Automatische Updates für das Grundsystem sind sinnvoll, damit du dich nicht darum
kümmern musst:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Home-Assistant-Updates laufen darüber **nicht** — die machst du bewusst und
kontrolliert, siehe [06-betrieb-und-troubleshooting.md](06-betrieb-und-troubleshooting.md).

---

## Checkliste Schritt 1

- [ ] Backup der alten SD-Karte liegt sicher
- [ ] System bootet von SSD (`lsblk` zeigt `TRAN=usb` für root)
- [ ] Sekundärer DNS im Router eingetragen
- [ ] Pi hat feste IP, notiert als `<PI-IP>`
- [ ] Port 8123 ist frei
- [ ] Pi-hole und MagicMirror laufen unverändert
- [ ] `docker run --rm hello-world` funktioniert

Erst wenn alle Haken sitzen, weiter zu [Schritt 2](02-docker-stack.md).
