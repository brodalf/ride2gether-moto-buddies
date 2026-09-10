# Schritt 3: Die vier Geräte anbinden

**Bitte einzeln vorgehen.** Ein Gerät anbinden, testen, kurz laufen lassen, dann das
nächste. Wenn du alle vier auf einmal einrichtest und etwas klemmt, weißt du nicht,
woran es lag.

---

## Empfohlene Reihenfolge

Vom Einfachsten zum Unsichersten. So hast du schnell Erfolgserlebnisse und die
frustanfälligen Sachen zum Schluss.

| # | Gerät | Aufwand | Erfolgsaussicht | Datei |
|---|---|---|---|---|
| 1 | Bearware WLAN-Steckdose | mittel | **hoch** | [bearware-306911.md](geraete/bearware-306911.md) |
| 2 | Ecovacs Deebot X11 Pro Omni | gering | **hoch**, Umfang unklar | [ecovacs-deebot-x11.md](geraete/ecovacs-deebot-x11.md) |
| 3 | Bosch Geschirrspüler SMU4EUS00D | mittel | **abhängig von WLAN-Modul** | [bosch-smu4eus00d.md](geraete/bosch-smu4eus00d.md) |
| 4 | Hisense 55E7NQ PRO | hoch | **unsicher** | [hisense-55e7nq-pro.md](geraete/hisense-55e7nq-pro.md) |

---

## Überblick: wie hängt was?

| Gerät | Weg | Cloud nötig? | Offline nutzbar? |
|---|---|---|---|
| Bearware 306911 | LocalTuya (empfohlen) | einmalig zum Auslesen | **ja** |
| Bearware 306911 | Tuya-Cloud (Alternative) | dauerhaft | nein |
| Ecovacs Deebot X11 | Ecovacs-Cloud | dauerhaft | nein |
| Bosch SMU4EUS00D | Home-Connect-Cloud | dauerhaft | nein |
| Hisense 55E7NQ PRO | MQTT im Heimnetz | nein | **ja** |

Zwei der vier Geräte funktionieren also nur, solange der Hersteller seine Server
betreibt. Das ist bei diesen Produkten technisch nicht änderbar — es ist keine
Fehlkonfiguration, sondern eine Eigenschaft der Geräte. Bewertung dazu in
[05-dsgvo-datenfluesse.md](05-dsgvo-datenfluesse.md).

---

## Feste IPs vergeben

Bevor du anfängst: Vergib im Router für **Fernseher** und **Steckdose** feste IP-Adressen
(gleiches Vorgehen wie beim Pi in Schritt 1.5).

Grund: Beide werden in Home Assistant über ihre IP angesprochen. Wenn der Router beim
nächsten Neustart eine andere Adresse vergibt, ist die Verbindung weg — und die Ursache
ist von außen schwer zu erkennen, weil in Home Assistant nur „nicht verfügbar" steht.

Trage die IPs hier ein, dann hast du sie beisammen:

```
Pi (Home Assistant):   192.168.178.___
Hisense TV:            192.168.178.___
Bearware Steckdose:    192.168.178.___
```

Der Geschirrspüler und der Saugroboter brauchen keine feste IP — sie laufen über die
Cloud des Herstellers und werden nicht direkt angesprochen.

---

## Nach jedem Gerät: kurz prüfen

```bash
free -h                                  # noch Luft nach oben?
docker compose logs --tail=50 homeassistant | grep -i error
```

Und ein Blick auf den MagicMirror: läuft er noch flüssig? Wenn der Spiegel anfängt zu
ruckeln, ist der RAM knapp — dann `purge_keep_days` in der `configuration.yaml`
weiter reduzieren (auf 3) oder das RAM-Limit in der `docker-compose.yml` prüfen.
