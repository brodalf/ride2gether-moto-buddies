# 05 – Social Login (Google & Facebook)

## Ansatz: Supabase OAuth – kein eigener Server nötig

Supabase übernimmt den gesamten OAuth-Flow nativ:
- Kein Passport.js, kein Express-Server, kein eigenes Token-Management
- Google und Facebook sind als Provider direkt im Supabase Dashboard konfigurierbar
- Der Redirect-Callback läuft über Supabase's eigene Infrastruktur

> **Vergleich zu Passport.js:** Passport.js wäre notwendig bei einem eigenen Node.js-Server.
> Da wir Supabase direkt vom Frontend aus nutzen, übernimmt Supabase Auth die Rolle,
> die Passport.js sonst spielen würde – inklusive Token-Handling, Session-Management
> und Callback-Verarbeitung.

---

## Implementierung im Frontend

```typescript
import { supabase } from '@/lib/supabase'

// Google OAuth starten
const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/profile-setup`
    }
  })
  if (error) console.error(error)
}

// Facebook OAuth starten
const loginWithFacebook = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${window.location.origin}/profile-setup`
    }
  })
  if (error) console.error(error)
}
```

Nach dem OAuth-Flow leitet Supabase den Nutzer automatisch zurück.
Die Session wird von Supabase verwaltet und ist sofort in der App verfügbar.

---

## OAuth-Flow (technisch)

```
Nutzer klickt "Mit Google anmelden"
    ↓
supabase.auth.signInWithOAuth({ provider: 'google' })
    ↓
Browser-Redirect → accounts.google.com
    ↓
Nutzer stimmt zu
    ↓
Google redirectet zu: https://<projekt>.supabase.co/auth/v1/callback
    ↓
Supabase validiert Code, erstellt/aktualisiert auth.users Eintrag
    ↓
Supabase redirectet zu: https://deine-app.de/profile-setup
    ↓
Supabase JS Client liest Session automatisch aus URL-Fragment
    ↓
supabase.auth.getSession() liefert gültige Session
```

---

## Session-Management

```typescript
// Aktuellen Nutzer abrufen
const { data: { session } } = await supabase.auth.getSession()
const user = session?.user

// Auf Auth-Änderungen reagieren (Login/Logout)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Nutzer eingeloggt → weiterleiten
  }
  if (event === 'SIGNED_OUT') {
    // Nutzer ausgeloggt → zur Login-Seite
  }
})

// Ausloggen
await supabase.auth.signOut()
```

---

## Profil nach OAuth automatisch anlegen

Der `handle_new_user` Trigger in der Datenbank legt nach jeder Registrierung
(egal ob Email oder OAuth) automatisch einen `profiles`-Eintrag an:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',  -- von Google/Facebook befüllt
    NEW.raw_user_meta_data->>'avatar_url'  -- Profilbild des Providers
  );
  RETURN NEW;
END;
$$;
```

Bei Google-Login enthält `raw_user_meta_data` automatisch Name und Profilbild –
diese werden direkt ins Profil übernommen.

---

## Google Developer Console – Schritt für Schritt

1. [console.cloud.google.com](https://console.cloud.google.com) öffnen
2. Projekt erstellen oder auswählen
3. **APIs & Services → OAuth consent screen**
   - User Type: **External**
   - App name: `ride2gether`
   - Authorized domains: `supabase.co`
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```
     https://<DEIN-PROJEKT-ID>.supabase.co/auth/v1/callback
     ```
5. Client ID und Client Secret kopieren
6. Im Supabase Dashboard: **Authentication → Providers → Google** → einfügen

---

## Facebook Developer Console – Schritt für Schritt

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. App type: **Consumer** | Name: `ride2gether`
3. Dashboard → **Add Product → Facebook Login → Set Up (Web)**
4. **Facebook Login → Settings → Valid OAuth Redirect URIs**:
   ```
   https://<DEIN-PROJEKT-ID>.supabase.co/auth/v1/callback
   ```
5. **Settings → Basic**: App ID und App Secret kopieren
6. Im Supabase Dashboard: **Authentication → Providers → Facebook** → einfügen

> **Wichtig:** Die Facebook App muss in den „Live"-Modus versetzt werden,
> damit sich andere Nutzer (nicht nur App-Admins) anmelden können.

---

## Token-Verschlüsselung (optional, für eigene API-Calls)

Falls du später selbst Google/Facebook API-Calls ausführen willst
(z. B. Kontakte importieren), kannst du Tokens verschlüsselt in
`user_oauth_providers` speichern:

```sql
-- Verschlüsseltes Speichern (pgcrypto muss aktiviert sein)
INSERT INTO user_oauth_providers (user_id, provider, provider_user_id, access_token_encrypted)
VALUES (
  auth.uid(),
  'google',
  'google-user-id-123',
  pgp_sym_encrypt('access-token-hier', 'dein-geheimer-schlüssel')
);

-- Entschlüsseln
SELECT pgp_sym_decrypt(access_token_encrypted::bytea, 'dein-geheimer-schlüssel')
FROM user_oauth_providers
WHERE user_id = auth.uid() AND provider = 'google';
```

Den Verschlüsselungsschlüssel als Supabase Vault Secret oder als Umgebungsvariable speichern –
niemals im Code hardcoden.
