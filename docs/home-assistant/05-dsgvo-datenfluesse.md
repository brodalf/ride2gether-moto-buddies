# Datenflüsse und Datenschutz

> **Hinweis:** Das hier ist eine technische Einordnung, keine Rechtsberatung.
> Wo ich etwas nicht sicher weiß, steht es ausdrücklich dabei.

---

## 1. Rechtliche Einordnung vorab

Für ein Smart Home im eigenen Haushalt greift die **Haushaltsausnahme** der DSGVO
(Art. 2 Abs. 2 lit. c). Solange du die Anlage rein privat betreibst, ist die DSGVO auf
deine eigene Verarbeitung **nicht anwendbar**. Du musst also kein
Verarbeitungsverzeichnis führen und keine Rechtsgrundlage dokumentieren.

**Wann das kippt** — dann wird es relevant:

- Du zeichnest Bereiche auf, in denen sich **regelmäßig andere Personen** aufhalten,
  die davon nichts wissen (Kamera, Mikrofon, auch der Saugroboter mit Kamera)
- Die Anlage erfasst **Nachbarn oder öffentlichen Raum**
- Du nutzt sie **gewerblich** oder vermietest die Wohnung möbliert weiter
- Du gibst Aufnahmen oder Auswertungen **weiter**

In deinem Setup ist der Saugroboter der einzige Kandidat, der potenziell Bilddaten
erzeugt. Wenn regelmäßig Besuch oder Mitbewohner in der Wohnung sind, ist ein kurzer
Hinweis an diese Personen fair und rechtlich die sichere Seite.

Die DSGVO bindet **die Hersteller** natürlich weiterhin — unabhängig davon, ob sie
dich bindet.

---

## 2. Wohin fließen deine Daten?

| Ziel | Wer | Was fließt | Ort | Vermeidbar? |
|---|---|---|---|---|
| **Kein Abfluss** | Hisense TV (Plan A/B) | — | Heimnetz | — |
| **Kein Abfluss** | Bearware via LocalTuya | — | Heimnetz | — |
| **Kein Abfluss** | Home Assistant selbst | — | Pi | — |
| Bosch/Siemens | Home Connect | Gerätestatus, Programme, Nutzungszeiten | EU (Bosch, DE) | ja, über Plan B |
| Ecovacs | Deebot X11 | Karten der Wohnung, Reinigungsverlauf, ggf. Kamerabilder | EU-Konto, Betreiber CN | nein, außer WLAN aus |
| Tuya | nur bei Cloud-Variante | Schaltvorgänge, Verbrauch | Frankfurt (bei richtiger Wahl) | ja, LocalTuya nutzen |
| Hetzner | dein Backup | verschlüsselte Blobs | Deutschland | — |

**Wichtige Einschränkung zur Ehrlichkeit:** Ich kann die tatsächlichen Serverstandorte
der Hersteller nicht überprüfen. Ecovacs und Tuya sind chinesische Unternehmen mit
EU-Niederlassungen (Ecovacs Europe GmbH, Düsseldorf — steht auf deinem Typenschild).
Ob und in welchem Umfang Daten nach China oder in die USA fließen, geht nur aus den
jeweiligen Datenschutzerklärungen hervor, und die ändern sich. Wenn dir das wichtig ist,
ist die Datenschutzerklärung des Herstellers die einzige belastbare Quelle.

---

## 3. Was dieses Setup bereits richtig macht

- **Home Assistant selbst sendet nichts.** Es gibt eine anonyme Statistik-Funktion,
  die standardmäßig **aus** ist.
- **Kein Nabu Casa Cloud.** Fernzugriff läuft über deinen eigenen WireGuard-Tunnel
  (Schritt 4).
- **Backup client-seitig verschlüsselt.** Auf dem Hetzner-Server liegen unlesbare Daten.
- **Hetzner ist ein deutsches Unternehmen** mit Rechenzentren in Deutschland/Finnland.
- **LocalTuya statt Tuya-Cloud** — der Schaltbefehl verlässt die Wohnung nicht.
- **Home Assistant nicht öffentlich erreichbar** — keine Angriffsfläche aus dem Internet.

---

## 4. Was du zusätzlich tun kannst

### Sofort und kostenlos

**Tuya-Rechenzentrum prüfen:** Bei der Projektanlage muss `Central Europe` ausgewählt
sein (Frankfurt). Die Voreinstellung ist oft ein anderes. Nachträglich lässt sich das
**nicht** ändern — dann Projekt neu anlegen.

**Ecovacs-Kamera abschalten:** In der Ecovacs-App unter den Geräteeinstellungen alle
Kamera- und Videofunktionen deaktivieren, die du nicht brauchst. Die Karte selbst
braucht der Roboter zum Navigieren, die lässt sich nicht abschalten.

**Statistik in Home Assistant prüfen:**
Einstellungen → System → Allgemein → „Analysen" — dort steht, was (nicht) gesendet wird.

**Pi-hole nutzen:** Du hast es ohnehin. Es filtert auch Telemetrie-Domains der
Smart-Home-Geräte. Ein Blick ins Query-Log zeigt dir sehr konkret, mit wem deine Geräte
eigentlich reden — das ist aufschlussreicher als jede Datenschutzerklärung.

### Mit etwas Aufwand

**Geräte-VLAN:** Smart-Home-Geräte in ein eigenes Netzsegment ohne Internetzugang
stecken. Funktioniert für den Fernseher und die Steckdose (die brauchen lokal kein
Internet), **nicht** für Saugroboter und Geschirrspüler — die sind ohne Cloud
funktionslos. Braucht einen Router/Switch mit VLAN-Unterstützung.

**Firewall-Regel statt VLAN:** Einfacher — im Router für Fernseher und Steckdose den
Internetzugang sperren (FritzBox: Kindersicherung → Zugangsprofil „gesperrt" für
Internet, Heimnetz bleibt erlaubt). Erreicht fast dasselbe mit wenigen Klicks.

---

## 5. Ehrliches Fazit

Zwei der vier Geräte — Saugroboter und Geschirrspüler — funktionieren **nur** mit der
Cloud des Herstellers. Das ist eine Eigenschaft der Produkte, keine Schwäche deiner
Konfiguration, und mit Home Assistant nicht zu umgehen.

Wichtig zu sehen: **Diese Daten fließen auch ohne Home Assistant**, sobald die Geräte mit
der Hersteller-App verbunden sind. Home Assistant liest sie nur zusätzlich aus — es
erzeugt keinen neuen Datenabfluss.

Was Home Assistant tatsächlich verbessert: Der Fernseher und die Steckdose funktionieren
damit **ohne** Cloud, und du bekommst eine zentrale Oberfläche, die dir gehört und deren
Daten auf deinem eigenen Gerät liegen.

Wenn dir Datensparsamkeit bei künftigen Anschaffungen wichtig ist, ist das
entscheidende Kriterium **lokale Steuerbarkeit**: Zigbee, Z-Wave, Matter, ESPHome oder
Thread. Diese Geräte funktionieren vollständig ohne Internet und ohne Herstellerkonto.
Das ist der Hebel, der wirklich etwas ändert — nicht die Konfiguration im Nachhinein.
