# Ecovacs Deebot X11 Pro Omni

> Modell DEX99-1 · Ecovacs Europe GmbH, Düsseldorf · Herstellungsdatum 10/25

---

## Kurzfassung

Home Assistant hat eine **offizielle, eingebaute Ecovacs-Integration**. Kein HACS nötig,
kein Basteln. Die Einrichtung dauert etwa zehn Minuten.

**Der Haken:** Die Verbindung läuft **immer über die Ecovacs-Cloud**. Es gibt bei diesem
Gerät keinen lokalen Weg. Ohne Internet steuerst du den Roboter nicht über Home Assistant
(die Taste am Gerät funktioniert natürlich weiter).

---

## Ehrliche Einschätzung zum Modell

Der X11 Pro Omni ist ein **sehr neues Modell** (Herstellungsdatum auf dem Typenschild:
Oktober 2025). Die Home-Assistant-Integration nutzt im Hintergrund die Bibliothek
`deebot-client`, die neue Modelle typischerweise mit einigen Monaten Verzögerung
vollständig unterstützt.

**Was das praktisch bedeutet:**

- **Wahrscheinlich funktioniert:** Starten, Stoppen, zur Basis schicken, Akkustand,
  Status, Fehlermeldungen, Saugstufe
- **Möglicherweise nicht:** Raumauswahl, Karten, Wischfunktion im Detail,
  Station-Funktionen (Selbstreinigung, Absaugen), Verbrauchsmaterial-Zähler

Falls Funktionen fehlen, ist das **kein Konfigurationsfehler auf deiner Seite**.
Bitte nicht stundenlang danach suchen — die Unterstützung wächst mit Updates nach.
Am schnellsten prüfst du es einfach praktisch: einrichten und schauen, was da ist.

---

## Einrichtung

### 1. Voraussetzung

Der Roboter muss in der **Ecovacs Home App** eingerichtet und funktionsfähig sein.
Notiere dir die Zugangsdaten (E-Mail/Telefonnummer + Passwort) des Ecovacs-Kontos.

### 2. In Home Assistant hinzufügen

1. **Einstellungen → Geräte & Dienste → Integration hinzufügen**
2. Nach **„Ecovacs"** suchen
3. Auswählen:
   - **Ecovacs Cloud** (nicht „Self-hosted")
   - **Land: Deutschland**
   - Kontodaten eingeben
4. Bestätigen — der Roboter erscheint als Gerät

### 3. Was du bekommst

Typischerweise diese Entitäten:

```
vacuum.deebot_x11              Hauptsteuerung (Start/Stop/Basis)
sensor.deebot_x11_battery      Akkustand
sensor.deebot_x11_status       Aktueller Zustand
sensor.deebot_x11_error        Fehlermeldung
select.deebot_x11_water_amount Wassermenge (falls unterstützt)
```

Die tatsächliche Liste hängt vom Stand der Modellunterstützung ab.

---

## Wichtig: Nur ein Gerät pro Konto gleichzeitig

Die Ecovacs-Cloud erlaubt pro Konto meist nur **eine aktive Verbindung**. Wenn Home
Assistant sich anmeldet, kann es passieren, dass du in der Handy-App abgemeldet wirst
(und umgekehrt) — dann wechseln sich beide ständig ab.

**Lösung:** In der Ecovacs-App ein **zweites Konto** anlegen und den Roboter dorthin
freigeben (App → Gerät → Einstellungen → Familie/Sharing). Home Assistant nutzt dann
das Zweitkonto, dein Handy behält das Hauptkonto.

Das ist der häufigste Stolperstein bei Ecovacs in Home Assistant — plane die zehn
Minuten gleich mit ein.

---

## Sinnvolle Automatisierung

Ein Beispiel, das im Alltag wirklich hilft: Der Roboter soll nicht losfahren, während
jemand zu Hause ist oder schläft.

```yaml
automation:
  - alias: "Saugen, wenn niemand da ist"
    trigger:
      - platform: state
        entity_id: group.bewohner
        to: "not_home"
        for: "00:15:00"
    condition:
      - condition: time
        after: "09:00:00"
        before: "17:00:00"
      - condition: state
        entity_id: vacuum.deebot_x11
        state: "docked"
    action:
      - service: vacuum.start
        target:
          entity_id: vacuum.deebot_x11
```

Die `for: "00:15:00"` verhindert, dass der Roboter losfährt, nur weil das Handy kurz
das WLAN verloren hat.

---

## Datenschutz-Hinweis

Der Roboter erstellt Karten deiner Wohnung und (je nach Modell und Einstellung) Bilder
über die Kamera. Diese Daten liegen bei Ecovacs, nicht bei dir.

Home Assistant ändert daran **nichts** — die Daten fließen ohnehin, sobald der Roboter
mit der App verbunden ist. Die Integration liest sie lediglich zusätzlich aus.

Wer das reduzieren will, hat bei diesem Gerät nur grobe Hebel: Kamerafunktionen in der
App deaktivieren, oder den Roboter ohne WLAN betreiben (dann entfallen aber App und
Home-Assistant-Anbindung komplett). Mehr dazu in
[05-dsgvo-datenfluesse.md](../05-dsgvo-datenfluesse.md).
