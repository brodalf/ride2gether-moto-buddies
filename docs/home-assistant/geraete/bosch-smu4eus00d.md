# Bosch Geschirrspüler SMU4EUS00D

> Serie 4, Unterbaugerät 60 cm

---

## Zuerst klären: Hat das Gerät überhaupt WLAN?

**Das ist die entscheidende Frage.** Nicht jedes Bosch-Gerät hat ein Home-Connect-Modul,
und ohne dieses Modul gibt es keine Möglichkeit, den Spüler direkt anzubinden — auch
nicht mit Umwegen.

So prüfst du es (eines der drei reicht):

1. **Bedienblende ansehen:** Gibt es eine Taste oder ein Symbol für WLAN / Home Connect?
2. **Bedienungsanleitung:** Im Inhaltsverzeichnis nach „Home Connect" suchen.
   Wenn es ein eigenes Kapitel gibt, ist das Modul verbaut.
3. **Home Connect App** installieren und „Gerät hinzufügen" starten. Findet sie den
   Spüler, ist alles gut.

→ **Modul vorhanden?** Weiter bei Abschnitt A.
→ **Kein Modul?** Weiter bei Abschnitt B (Plan B funktioniert gut).

Ich kann dir für dieses konkrete Modell nicht zuverlässig sagen, ob Home Connect verbaut
ist — die Ausstattung variiert innerhalb der Serie 4 je nach Ausführung. Bitte prüfe es
selbst, das dauert zwei Minuten und erspart dir sonst eine Stunde vergebliche Einrichtung.

---

## A) Mit Home Connect

Home Assistant hat eine **offizielle, eingebaute Home-Connect-Integration**. Die
Einrichtung ist etwas umständlicher als sonst, weil Bosch einen Entwicklerzugang verlangt
— aber sie ist einmalig und danach stabil.

### 1. Gerät in der Home Connect App einrichten

Ohne das geht der Rest nicht. App installieren, Konto anlegen, Spüler verbinden.

### 2. Entwicklerkonto bei Bosch

1. `https://developer.home-connect.com` → registrieren
   **Wichtig:** dieselbe E-Mail-Adresse wie in der Home Connect App verwenden,
   sonst sieht die Anwendung deine Geräte nicht.
2. **Applications → Register Application**
   - **Application ID:** frei wählbar, z. B. `homeassistant`
   - **OAuth Flow:** `Authorization Code Grant Flow`
   - **Redirect URI:** `https://my.home-assistant.io/redirect/oauth`
   - **Home Connect User Account:** deine App-E-Mail-Adresse
3. **Client ID** und **Client Secret** notieren

### 3. In Home Assistant eintragen

1. **Einstellungen → Geräte & Dienste → Integration hinzufügen → „Home Connect"**
2. Client ID und Client Secret eingeben
3. Es öffnet sich die Bosch-Anmeldeseite → anmelden → Zugriff erlauben
4. Zurückleitung zu Home Assistant, Gerät erscheint

### Zur Redirect-URI

`my.home-assistant.io` ist nur eine Weiterleitungsseite. Sie leitet deinen Browser
zurück auf deine lokale Home-Assistant-Adresse. **Es fließen dabei keine Gerätedaten
über diesen Dienst** — nur dein Browser wird umgeleitet. Deshalb funktioniert das auch,
obwohl Home Assistant gar nicht aus dem Internet erreichbar ist.

Falls die Weiterleitung nicht klappt: In Home Assistant unter
**Einstellungen → System → Netzwerk** die interne Adresse (`http://<PI-IP>:8123`)
eintragen und `my.home-assistant.io` einmal im Browser aufrufen, um sie zu hinterlegen.

### 4. Was du bekommst

```
binary_sensor.geschirrspuler_door       Tür offen/zu
sensor.geschirrspuler_operation_state   Läuft / Fertig / Bereit
sensor.geschirrspuler_remaining_time    Restzeit
sensor.geschirrspuler_program_progress  Fortschritt in %
switch.geschirrspuler_power             Ein/Aus (je nach Modell)
```

### Ehrliche Einschränkung

**Starten aus der Ferne funktioniert nur eingeschränkt.** Aus Sicherheitsgründen muss am
Gerät selbst „Fernstart" aktiviert werden — und das gilt meist nur für **einen** Durchlauf.
Du kannst also nicht zuverlässig „jeden Abend um 22 Uhr starten" automatisieren.

Was gut funktioniert, ist das **Auslesen**: Restzeit, Fortschritt und vor allem die
Fertig-Meldung. Das ist im Alltag ohnehin der nützlichere Teil.

---

## B) Ohne Home Connect: Plan B über die Steckdose

Wenn kein WLAN-Modul verbaut ist, gibt es trotzdem eine gute Lösung — und du hast die
Hardware bereits: die **Bearware-Steckdose** mit Verbrauchsmessung.

**Prinzip:** Ein Geschirrspüler zieht während des Programms Strom (mehrere hundert bis
~2200 W) und fällt danach auf wenige Watt. An diesem Muster erkennt man zuverlässig,
ob er läuft und wann er fertig ist.

**Voraussetzung:** Die Steckdose muss Leistung messen können — bitte in Home Assistant
prüfen, ob ein Sensor mit Watt-Angabe auftaucht (siehe
[bearware-306911.md](bearware-306911.md)). Nicht alle Modelle können das.

### Konfiguration

```yaml
# in configuration.yaml
template:
  - binary_sensor:
      - name: "Geschirrspüler läuft"
        state: >
          {{ states('sensor.bearware_steckdose_power') | float(0) > 10 }}
        delay_off: "00:05:00"    # kurze Pausen im Programm nicht als "fertig" werten
        device_class: running
```

Die `delay_off`-Zeit ist der entscheidende Wert: Ein Spülprogramm hat Phasen mit sehr
geringem Verbrauch (Einweichen, Abtropfen). Ohne die Verzögerung würde die Meldung
mehrfach fälschlich „fertig" sagen. Fünf Minuten sind ein guter Startwert; beobachte
den Verlauf einmal und passe ihn an, falls nötig.

### Benachrichtigung bei Programmende

```yaml
automation:
  - alias: "Geschirrspüler fertig"
    trigger:
      - platform: state
        entity_id: binary_sensor.geschirrspuler_lauft
        from: "on"
        to: "off"
    action:
      - service: notify.mobile_app_dein_handy
        data:
          title: "Geschirrspüler"
          message: "Fertig — kann ausgeräumt werden."
```

### Ehrliche Bewertung von Plan B

**Was du bekommst:** läuft / läuft nicht, fertig-Meldung, Stromverbrauch pro Durchlauf.
**Was fehlt:** Restzeit, Programmname, Fortschritt in Prozent, Fernstart.

Für den Alltag deckt das den wichtigsten Fall ab („ist er fertig?"). Und es hat zwei
Vorteile gegenüber Home Connect: Es funktioniert **komplett lokal**, ohne Bosch-Cloud,
und es hört nicht auf zu funktionieren, wenn Bosch irgendwann die Schnittstelle ändert.

**Sicherheitshinweis:** Die Steckdose ist für 16 A / 3680 W ausgelegt, ein Geschirrspüler
liegt mit rund 2200 W darunter — das passt. Trotzdem: Steckdose frei zugänglich und
nicht hinter dem Gerät eingeklemmt montieren, und nicht in Kombination mit
Mehrfachsteckdosen betreiben.
