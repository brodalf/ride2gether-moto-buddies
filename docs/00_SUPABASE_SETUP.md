# 00 – Supabase-Projekt einrichten

## Übersicht
Diese App verwendet den **Supabase JS Client direkt im Frontend** – kein eigener Server nötig.
Supabase übernimmt Auth (inkl. Google/Facebook OAuth), Datenbank (PostgreSQL + PostGIS) und
Row-Level-Security vollständig.

---

## Schritt 1: Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) einloggen → **New Project**
2. Name: `ride2gether` | Region: nächstgelegene EU-Region | Passwort merken
3. Warten bis Projekt bereit ist (ca. 1 Minute)

---

## Schritt 2: PostGIS aktivieren

Im Supabase Dashboard → **Database → Extensions**:
- `postgis` aktivieren
- `pgcrypto` aktivieren

Alternativ im SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## Schritt 3: Datenbank-Migration ausführen

**Database → SQL Editor → New query**:
1. Inhalt von `sql/01_MIGRATION.sql` einfügen → **Run**
2. Inhalt von `sql/06_ZUSATZ_FUNKTIONEN.sql` einfügen → **Run**

---

## Schritt 4: Google OAuth konfigurieren

### Google Cloud Console
1. [console.cloud.google.com](https://console.cloud.google.com) → neues Projekt oder vorhandenes wählen
2. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs:
   ```
   https://<DEIN-PROJEKT>.supabase.co/auth/v1/callback
   ```
5. **Client ID** und **Client Secret** kopieren

### Supabase Dashboard
**Authentication → Providers → Google**:
- Enable: ✓
- Client ID und Client Secret einfügen
- **Save**

---

## Schritt 5: Facebook OAuth konfigurieren

### Meta Developer Console
1. [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. App-Typ: **Consumer** | App-Name: `ride2gether`
3. **Facebook Login → Settings → Valid OAuth Redirect URIs**:
   ```
   https://<DEIN-PROJEKT>.supabase.co/auth/v1/callback
   ```
4. **App ID** und **App Secret** kopieren (Settings → Basic)

### Supabase Dashboard
**Authentication → Providers → Facebook**:
- Enable: ✓
- App ID und App Secret einfügen
- **Save**

---

## Schritt 6: Storage Bucket anlegen

**Storage → New Bucket**:
- Name: `photos`
- Public: ✓ (damit Profilbilder öffentlich sichtbar sind)
- Allowed MIME types: `image/jpeg, image/png, image/webp`
- Max file size: `5 MB`

---

## Schritt 7: Umgebungsvariablen setzen

Im Supabase Dashboard **Settings → API**:
- **Project URL** → in `.env` als `VITE_SUPABASE_URL`
- **anon public key** → in `.env` als `VITE_SUPABASE_ANON_KEY`

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Schritt 8: App starten

```bash
cp .env.example .env
# .env mit echten Werten befüllen

npm install
npm run dev
```

---

## Realtime aktivieren

Für den Live-Chat muss Realtime für die `messages` Tabelle aktiv sein.
Das erledigt die Migration automatisch:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

Alternativ: **Database → Replication → Tables** → `messages` aktivieren.
