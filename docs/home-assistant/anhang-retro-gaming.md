# Anhang: N64-Emulation über die SSD (optional)

> Kein Teil des Home-Assistant-Setups. Nur relevant, wenn der freie Platz auf der SSD
> für Retro-Gaming genutzt werden soll.

---

## Die Kernaussage

**Platz nutzen: ja. Emulator auf demselben Pi: nein. Auf dem Fernseher selbst: nicht möglich.**

Die tragfähige Aufteilung:

```
Bestehender Pi 4  ──►  Netzwerkfreigabe (Samba) auf der SSD
   (unangetastet)              │
                               │ ROMs über LAN
                               ▼
                   Zweites Gerät am Fernseher  ──HDMI──►  Hisense TV
```

---

## Warum nicht auf dem bestehenden Pi?

Der Pi 4 versorgt bereits DNS für den ganzen Haushalt (Pi-hole), das Smart Home
(Home Assistant) und den Spiegel (MagicMirror). N64-Emulation braucht **dauerhaft**
CPU und GPU.

Praktische Folge: Das Spiel ruckelt, der MagicMirror ruckelt, Home Assistant wird träge —
alles gleichzeitig. Ein Pi 4 schafft N64 nur, wenn er sich um sonst nichts kümmert.

Dazu kommt: Der Pi hängt beim Spiegel, nicht beim Fernseher. Ein HDMI-Kabel quer durch
die Wohnung ist keine Lösung. Der Pi 4 hat zwar zwei HDMI-Anschlüsse, aber das löst
das Leistungsproblem nicht.

**Der Sinn des ganzen Setups war ein stabiler, langweiliger Unterbau.** Emulation gehört
nicht darauf.

---

## Warum nicht auf dem Fernseher?

Der Hisense 55E7NQ PRO läuft mit **VIDAA** — einer geschlossenen Plattform mit kleinem,
kuratiertem App-Store. Es gibt dort:

- keinen Emulator
- keinen Moonlight- oder Streaming-Client
- keine Möglichkeit, eigene Apps zu installieren (kein Sideloading)

Das ist eine Eigenschaft der Plattform und nicht durch Konfiguration zu ändern.

**Casting ist auch keine Lösung.** AirPlay oder Chromecast haben 200 ms Verzögerung und
mehr. Für Filme in Ordnung, zum Spielen unbenutzbar — bei Mario Kart merkt man schon
60 ms deutlich.

---

## Was funktioniert: zweites Gerät am Fernseher

### Geräteauswahl

| Gerät | Kosten | N64-Leistung | Anmerkung |
|---|---|---|---|
| Zweiter Pi 4 (gebraucht) + Batocera | ~50–60 € | brauchbar | scheitert an schweren Titeln |
| Raspberry Pi 5 + Batocera | ~90 € | deutlich besser | |
| Mini-PC gebraucht (Intel N100 o. ä.) | ~120–150 € | **am besten** | genauere Emulator-Kerne möglich |
| Nvidia Shield TV | ~150 € | gut | zusätzlich guter TV-Streamer |

**Ehrlich zur N64-Emulation auf dem Pi 4:** Die meisten bekannten Titel laufen
(Mario 64, Mario Kart 64, Zelda OoT/MM, Goldeneye, Diddy Kong Racing). Zuverlässig
Probleme machen die Titel mit eigenwilliger Grafik-Microcode-Nutzung — Perfect Dark,
Conker's Bad Fur Day, Rogue Squadron, World Driver Championship. Das ist keine
Konfigurationsfrage: Dem Pi 4 fehlt schlicht die Rechenleistung für die genauen
Emulator-Kerne.

Wenn dir diese Titel wichtig sind, führt der Weg über x86 (Mini-PC). Dort laufen
genauere Kerne wie ParaLLEl RDP oder simple64.

### Software auf dem zweiten Gerät

**Batocera** (empfohlen): fertiges System, bootet von SD-Karte, unterstützt
Netzwerkfreigaben direkt in der Oberfläche. Kein Linux-Wissen nötig.

Alternativen: RetroPie (mehr Kontrolle, mehr Aufwand), Lakka (schlank), oder auf einem
Mini-PC einfach RetroArch unter Linux/Windows.

---

## Die Netzwerkfreigabe auf dem bestehenden Pi

Dateien ausliefern kostet praktisch keine Rechenleistung — das ist der Grund, warum
diese Aufteilung sauber funktioniert. Der Smart-Home-Pi merkt davon nichts.

### 1. Verzeichnis anlegen

```bash
sudo mkdir -p /srv/roms/n64
sudo chown -R $USER:$USER /srv/roms
```

### 2. Samba installieren und einrichten

```bash
sudo apt install -y samba

sudo tee -a /etc/samba/smb.conf >/dev/null <<'EOF'

[roms]
   path = /srv/roms
   browseable = yes
   read only = yes
   guest ok = no
   valid users = roms
EOF

# eigener Benutzer nur fuer die Freigabe - nicht das eigene Konto verwenden
sudo useradd -M -s /usr/sbin/nologin roms
sudo smbpasswd -a roms
sudo systemctl restart smbd
```

**`read only = yes` ist bewusst gewählt.** Das Spielgerät muss nur lesen. Damit kann ein
kompromittiertes oder falsch konfiguriertes Gerät auf dem Smart-Home-Pi nichts
verändern — und Spielstände liegen ohnehin lokal auf dem Spielgerät.

Wenn du Spielstände zentral sichern willst, lege dafür eine **zweite, schreibbare**
Freigabe an (`/srv/roms/saves`) statt die ganze Freigabe zu öffnen.

### 3. Im Backup mitnehmen — oder bewusst nicht

Standardmäßig sichert das Backup-Skript nur `/opt/homeassistant`. ROMs gehören da nicht
hinein: Sie sind groß, ändern sich nie, und würden das Backup unnötig aufblähen.

Falls du sie doch sichern willst, in `/usr/local/bin/backup-homeassistant.sh` beim
`restic backup`-Aufruf `/srv/roms` ergänzen. Bedenke aber den Platzbedarf auf dem
Hetzner-Server.

### 4. In Batocera einbinden

In Batocera unter **System Settings → Storage** bzw. über die Netzwerk-Optionen die
Freigabe `\\<PI-IP>\roms` mit dem Benutzer `roms` einbinden.

Bandbreite ist unkritisch: ROMs werden einmal beim Spielstart geladen (max. 64 MB).
Auch WLAN reicht dafür problemlos.

---

## Controller

Praktischer Hinweis, der oft übersehen wird: Der N64-Controller hat ein
ungewöhnliches Layout — ein einzelner Analogstick plus vier C-Buttons.

- **8BitDo-Controller** (z. B. Pro 2): funktionieren gut, C-Buttons landen auf dem
  zweiten Stick. Etwas Umgewöhnung, aber alltagstauglich.
- **Original-N64-Controller per USB-Adapter**: authentisch, aber die alten Analogsticks
  sind nach 25 Jahren meist ausgeschlagen.
- **Nachbauten mit N64-Layout** (z. B. Retro Fighters): guter Kompromiss.

---

## Rechtliche Einordnung

> Keine Rechtsberatung. Aber wichtig genug, um es klar zu benennen.

**Der Emulator ist legal.** Freie Software, keine Grauzone. Ein BIOS wird beim N64 nicht
benötigt (anders als etwa bei der PlayStation).

**Die ROMs sind das Problem.** In Deutschland ist das Herunterladen von Spiel-ROMs aus
dem Internet eine Urheberrechtsverletzung — **auch dann, wenn du das Original-Modul
besitzt**. Die Privatkopie nach § 53 UrhG deckt das nicht ab, weil du die Kopie selbst
aus deinem eigenen Original erstellen müsstest.

**Der sichere Weg:** eigene Module mit einem Cartridge-Dumper (z. B. Retrode oder
GB/N64-Dumper, ~60–100 €) selbst auslesen. Beim N64 gibt es keinen Kopierschutz zu
umgehen, das Auslesen des eigenen Moduls ist also unproblematisch.

Alles andere ist ein bewusstes Risiko. Die Einordnung gehört dir — sie sollte nur nicht
aus Unwissenheit passieren.

---

## Zusammenfassung in drei Sätzen

Die SSD als ROM-Speicher über eine Netzwerkfreigabe zu nutzen ist eine gute Idee und
belastet den Smart-Home-Pi praktisch nicht. Der Emulator selbst braucht ein eigenes
Gerät am Fernseher, weil VIDAA keine eigenen Apps zulässt und der Pi 4 mit drei Diensten
schon ausgelastet ist. Wenn du kaufst, bekommst du mit einem gebrauchten Mini-PC pro
Euro die beste N64-Leistung.
