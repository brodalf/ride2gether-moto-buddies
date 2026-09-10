#!/usr/bin/env bash
#
# Taegliches, verschluesseltes Backup von Home Assistant nach Hetzner.
# Ablegen unter: /usr/local/bin/backup-homeassistant.sh   (chmod +x)
#
# WICHTIG: Das restic-Passwort in /root/.restic-password muss an einem
# ZWEITEN Ort gesichert sein. Ohne dieses Passwort ist das Backup
# unwiederbringlich verloren.

set -euo pipefail

# ---- anpassen -------------------------------------------------------------
SERVER="<SERVER-IP>"
REPO="sftp:backup@${SERVER}:/srv/backup/homeassistant"
HA_DIR="/opt/homeassistant"
# ---------------------------------------------------------------------------

export RESTIC_REPOSITORY="$REPO"
export RESTIC_PASSWORD_FILE="/root/.restic-password"

log() { echo "[$(date '+%F %T')] $*"; }

# 1) Home Assistant anhalten, damit die Datenbank konsistent gesichert wird.
#    Eine SQLite-Datei, die waehrend eines Schreibvorgangs kopiert wird, kann
#    beschaedigt sein - dann merkt man es erst beim Zurueckspielen.
log "Stoppe Home Assistant"
cd "$HA_DIR"
docker compose stop homeassistant

# Sicherstellen, dass Home Assistant auch bei einem Fehler wieder startet.
trap 'log "Starte Home Assistant wieder"; cd "$HA_DIR" && docker compose start homeassistant' EXIT

# 2) Sichern
log "Sichere $HA_DIR"
restic backup "$HA_DIR" \
  --exclude "$HA_DIR/config/home-assistant_v2.db-wal" \
  --exclude "$HA_DIR/config/home-assistant_v2.db-shm" \
  --exclude "$HA_DIR/config/.storage/*.corrupt.*" \
  --exclude "$HA_DIR/config/tts" \
  --exclude "$HA_DIR/config/deps" \
  --exclude "$HA_DIR/config/*.log" \
  --tag homeassistant

# 3) Alte Sicherungen aufraeumen
log "Raeume alte Snapshots auf"
restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --prune

# 4) Integritaet stichprobenartig pruefen
log "Pruefe Repository"
restic check --read-data-subset=5%

log "Backup abgeschlossen"
