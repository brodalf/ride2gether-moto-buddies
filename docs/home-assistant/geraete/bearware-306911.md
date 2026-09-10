# Bearware WLAN-Steckdose (Mod.-Nr. 306911)

> WD Plus GmbH, Hannover · 220–240 V, 16 A, max. 3680 W · WLAN 2,4 GHz

---

## Was das für ein Gerät ist

„Bearware" ist ein Handelsname. Die Steckdose selbst ist mit sehr hoher
Wahrscheinlichkeit ein **Tuya-Gerät** — dieselbe Hardware und Software steckt unter
Dutzenden Markennamen. Erkennbar daran, dass die Einrichtung über die App
**Smart Life** oder **Tuya Smart** läuft.

Das ist eine gute Nachricht: Tuya-Geräte lassen sich sehr gut in Home Assistant
einbinden, auch komplett ohne Cloud.

**Wichtig:** 2,4 GHz WLAN. Wenn dein Router 2,4 und 5 GHz unter demselben Namen
zusammenfasst, kann die Einrichtung fehlschlagen. Falls es klemmt: 5-GHz-Band im Router
vorübergehend abschalten oder ein separates 2,4-GHz-Gastnetz nutzen.

---

## Drei Wege — welchen nehmen?

| Weg | Cloud | Aufwand | Empfehlung |
|---|---|---|---|
| **A: LocalTuya** | nur einmalig zum Auslesen | mittel | **← so machen** |
| B: Tuya-Cloud-Integration | dauerhaft | gering | nur als Notlösung |
| C: Firmware ersetzen (OpenBeken) | nie | hoch, Risiko | nur für Bastler |

### Warum nicht Weg B?

Die offizielle Tuya-Integration braucht ein Entwicklerkonto auf der Tuya-IoT-Plattform.
Deren kostenloser Zugang läuft ab und muss **halbjährlich manuell verlängert** werden.
Wenn man das vergisst, hören die Geräte ohne Vorwarnung auf zu funktionieren — und man
sucht den Fehler erst mal woanders. Dazu kommt: Jeder Schaltbefehl läuft über
Tuya-Server, also mit Verzögerung und nur bei bestehender Internetverbindung.

### Warum nicht Weg C?

Neuere Bearware-Steckdosen nutzen meist einen BK7231-Chip. Der lässt sich mit
`tuya-cloudcutter` auf freie Firmware umflashen — dann läuft alles rein lokal.
Das ist technisch die sauberste Lösung, aber: **Bei einem Fehlschlag ist die Steckdose
Elektroschrott**, und Garantie gibt es danach keine mehr. Für eine einzelne Steckdose
lohnt das Risiko nicht.

---

## Weg A: LocalTuya (empfohlen)

Prinzip: Du liest **einmalig** über die Tuya-Cloud die Zugangsdaten des Geräts aus
(Device ID + Local Key). Danach spricht Home Assistant die Steckdose **direkt im
Heimnetz** an. Kein Internet, keine Verzögerung, kein Ablaufdatum.

### 1. Steckdose in der App einrichten

Falls noch nicht geschehen: mit **Smart Life** (oder der Bearware-App) einrichten.
Die Steckdose muss dort funktionieren, sonst geht der Rest nicht.

### 2. Tuya-IoT-Konto anlegen

1. `https://iot.tuya.com` → Konto anlegen
2. **Cloud → Development → Create Cloud Project**
   - **Data Center: `Central Europe`** ← wichtig für DSGVO, siehe unten
   - Industry/Development Method: Standardwerte reichen
3. Nach dem Anlegen: **Client ID** und **Client Secret** notieren
4. Reiter **Devices → Link App Account → Add App Account**
   → QR-Code mit der Smart-Life-App scannen (Profil → Scan-Symbol oben rechts)
5. Unter **Devices** muss die Steckdose jetzt auftauchen

**Data Center „Central Europe" ist die richtige Wahl.** Es liegt in Frankfurt.
Die Voreinstellung ist oft ein anderes Rechenzentrum — bitte aktiv umstellen.

### 3. Local Key auslesen

In Home Assistant:

1. **HACS → Integrationen → Suche „LocalTuya" → installieren**
2. Home Assistant neu starten
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → LocalTuya**
4. Client ID, Client Secret, Region **Europe**, Nutzer-ID aus dem Tuya-Projekt eintragen
5. LocalTuya lädt die Geräteliste inklusive Local Key

### 4. Steckdose hinzufügen

- Gerät aus der Liste wählen
- IP-Adresse: die feste IP der Steckdose
- Protokollversion: **3.3** probieren, bei Fehlern **3.4**
- Entität hinzufügen: `switch`, DP-ID meist **1**

Falls Verbrauchsmessung vorhanden ist (nicht alle Modelle haben sie), kommen weitere
DP-IDs dazu — typischerweise:

| DP-ID | Bedeutung | Einheit |
|---|---|---|
| 18 | Strom | mA |
| 19 | Leistung | W (÷10) |
| 20 | Spannung | V (÷10) |

Beim Anlegen als Sensor jeweils den passenden Faktor (`scaling`) setzen.

### 5. Testen

Steckdose in Home Assistant an- und ausschalten. Dann zur Gegenprobe:
**Internetkabel am Router ziehen** und nochmal schalten. Wenn es weiter funktioniert,
läuft die Verbindung wirklich lokal.

---

## Praktischer Tipp: Verbrauchsmessung als Ersatz-Sensor

Falls die Steckdose Leistung messen kann, ist sie **mehr wert als nur ein Schalter**.

Man kann damit erkennen, ob ein angeschlossenes Gerät fertig ist — zum Beispiel:
Der Geschirrspüler zieht während des Programms Strom und fällt danach auf wenige Watt.
Das ergibt eine zuverlässige „Fertig"-Meldung, **ganz ohne Cloud und ohne WLAN im Gerät**.

Das ist der Plan B für den Bosch-Geschirrspüler, falls dieser kein Home Connect hat.
Siehe [bosch-smu4eus00d.md](bosch-smu4eus00d.md).

Achtung bei der Belastung: 3680 W bei 16 A ist das Maximum der Steckdose. Ein
Geschirrspüler (~2200 W) liegt gut darunter, das passt. Bei Herd oder Durchlauferhitzer
wäre es zu viel — aber die hängen ohnehin fest verkabelt.

---

## Fehlersuche

| Symptom | Ursache | Lösung |
|---|---|---|
| Wird in der App nicht gefunden | 5-GHz-WLAN | 2,4-GHz-Band separat bereitstellen |
| LocalTuya: „connection failed" | falsche Protokollversion | 3.3 ↔ 3.4 tauschen |
| Funktioniert, fällt später aus | IP hat sich geändert | feste IP im Router vergeben |
| Nach Stromausfall weg | Local Key neu vergeben | Local Key erneut auslesen |
| Schaltet, zeigt aber falschen Zustand | falsche DP-ID | andere DP-ID testen |

**Nicht in der Smart-Life-App löschen**, solange LocalTuya läuft — dabei wird der
Local Key neu vergeben und die Verbindung bricht ab.
