# Hisense 55E7NQ PRO (VIDAA)

> 55" QLED, VIDAA-Betriebssystem

**Das ist das unsicherste Gerät in diesem Setup.** Bitte zuletzt angehen und mit
realistischer Erwartung. Es gibt einen guten Plan B, der garantiert funktioniert.

---

## Ausgangslage, ehrlich

Es gibt **keine offizielle Home-Assistant-Integration für Hisense/VIDAA**. Es existiert
nur eine Community-Lösung, die sich mit dem MQTT-Broker verbindet, den der Fernseher
selbst mitbringt (Port 36669).

Das Problem daran: Hisense ändert dieses Protokoll mit Firmware-Updates immer wieder —
Zertifikate, Pairing-Ablauf, Verschlüsselung. Ob es mit **deinem** Modell und **deinem**
Firmwarestand funktioniert, lässt sich vorher nicht sagen. Es kann auf Anhieb klappen,
und es kann nach dem nächsten TV-Update wieder aufhören.

**Deshalb die Empfehlung:** Plan A einmal versuchen (etwa 30 Minuten). Wenn es nicht
innerhalb dieser Zeit läuft, auf Plan B wechseln, statt sich festzubeißen.

---

## Vorbereitung (für beide Pläne nötig)

### 1. Feste IP für den Fernseher

Im Router zuweisen (siehe [03-geraete-uebersicht.md](../03-geraete-uebersicht.md)).

### 2. Einstellungen im TV

Am Fernseher unter **Einstellungen → System → Schnellstart** (Name variiert je nach
Firmware, teils „Schnellstartmodus" oder „Wake on LAN"):

- **Schnellstart: EIN** — sonst schaltet der Fernseher im Standby das Netzwerk komplett
  ab und ist gar nicht erreichbar. Kostet etwas mehr Strom im Standby, ist aber
  Voraussetzung für jede Form von Fernsteuerung.
- Falls vorhanden: **Wake on LAN / Wake on WiFi** einschalten.

### 3. Erreichbarkeit prüfen

Auf dem Pi:

```bash
# Antwortet der Fernseher überhaupt?
ping -c3 <TV-IP>

# Ist der MQTT-Port offen? (TV muss dafür EINgeschaltet sein)
nc -zv <TV-IP> 36669
```

Wenn Port 36669 **geschlossen** ist, funktioniert Plan A definitiv nicht — dann direkt
zu Plan B. Das erspart dir den ganzen Rest.

---

## Plan A: Community-Integration über HACS

### Installation

1. **HACS → Integrationen → Menü (⋮) → Benutzerdefinierte Repositories**
2. Repository hinzufügen: `https://github.com/sehaas/ha-hisense-tv`, Kategorie
   **Integration**
3. Installieren, Home Assistant neu starten
4. **Einstellungen → Geräte & Dienste → Integration hinzufügen → „Hisense TV"**
5. IP-Adresse und MAC-Adresse des Fernsehers eintragen
6. **Der Fernseher zeigt einen vierstelligen Code auf dem Bildschirm** — diesen in
   Home Assistant eingeben

### Wenn es funktioniert

```
media_player.hisense_tv     Ein/Aus, Lautstärke, Quelle, App starten
```

### Wenn es nicht funktioniert

Typische Symptome und was sie bedeuten:

| Symptom | Bedeutung |
|---|---|
| Kein Pairing-Code auf dem TV | Firmware nutzt anderes Verfahren → Plan B |
| „Connection refused" auf 36669 | Broker aus oder Schnellstart aus |
| Verbindet, aber keine Reaktion | Protokollversion passt nicht → Plan B |
| Funktioniert, nach TV-Update weg | Firmware hat das Protokoll geändert |

**Bitte nicht länger als etwa 30 Minuten investieren.** Wenn es nach dem Pairing-Versuch
nicht läuft, liegt es an der Firmware und nicht an dir. Vorher lohnt genau ein Versuch:
den Fernseher einmal komplett vom Strom trennen (30 Sekunden) und neu starten.

---

## Plan B: IR-Fernbedienung nachbauen (funktioniert garantiert)

Statt das Netzwerkprotokoll zu nutzen, steuerst du den Fernseher so, wie es die
Fernbedienung tut: per Infrarot. Das ist herstellerunabhängig und **überlebt jedes
Firmware-Update**.

**Hardware:** Ein IR-Blaster, z. B. **Broadlink RM4 mini** (rund 25–30 €). In Home
Assistant offiziell unterstützt.

**Ablauf:**

1. Broadlink mit der Broadlink-App einrichten (2,4 GHz WLAN)
2. In Home Assistant: **Integration hinzufügen → Broadlink** (wird meist automatisch
   gefunden)
3. Fernbedienungstasten anlernen:
   ```yaml
   service: remote.learn_command
   target:
     entity_id: remote.broadlink_wohnzimmer
   data:
     device: fernseher
     command: power
   ```
   Nach dem Auslösen die Taste der Original-Fernbedienung auf den Broadlink richten
   und drücken. Für jede gewünschte Taste wiederholen (Power, Lautstärke, Quelle).

**Was du bekommst:** Alles, was die Fernbedienung kann — zuverlässig.

**Was fehlt — und das ehrlich:** Der Fernseher **meldet nichts zurück**. Home Assistant
weiß nicht, ob er an ist, welche Lautstärke eingestellt ist oder welche App läuft.
IR ist eine Einbahnstraße.

Für den Rückkanal gibt es einen einfachen Trick: **die Bearware-Steckdose**. Ein
eingeschalteter Fernseher zieht deutlich mehr Strom als im Standby.

```yaml
template:
  - binary_sensor:
      - name: "Fernseher an"
        state: "{{ states('sensor.bearware_steckdose_power') | float(0) > 30 }}"
        device_class: power
```

Damit hast du Steuerung (IR) **und** Statuserkennung (Verbrauch) — praktisch fast so gut
wie eine echte Integration, aber unabhängig von Hisense.

Wichtig: Den Fernseher **nicht** über die Steckdose stromlos schalten. Das verhindert
Standby-Updates und kann bei manchen Geräten die Einstellungen beschädigen. Die
Steckdose dient hier nur zum Messen.

---

## Plan C: Nur einschalten reicht dir?

Falls du eigentlich nur „Fernseher an, wenn ich nach Hause komme" willst, geht das ohne
alles weitere über Wake-on-LAN:

```yaml
# in configuration.yaml
wake_on_lan:

switch:
  - platform: wake_on_lan
    name: "Fernseher einschalten"
    mac: "AA:BB:CC:DD:EE:FF"     # MAC des Fernsehers
    host: <TV-IP>
```

Das funktioniert bei vielen VIDAA-Geräten, sofern Schnellstart aktiviert ist.
**Ausschalten geht damit nicht** — nur einschalten. Aber es ist in fünf Minuten
eingerichtet und einen Versuch wert, bevor du Geld für einen IR-Blaster ausgibst.

---

## Empfohlenes Vorgehen in einem Satz

Erst Plan C testen (5 Min, kostenlos), dann Plan A versuchen (30 Min, kostenlos),
und wenn beides nicht reicht, Plan B kaufen (30 €, funktioniert sicher).
