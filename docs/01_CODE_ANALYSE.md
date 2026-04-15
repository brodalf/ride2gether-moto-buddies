# 01 – Code-Analyse: Ausgangszustand

## Zusammenfassung

Die App ist beim Ausgangsstand **komplett frontend-only**. Alle Profile, Chats, Events und
Matches sind hartkodierte Mock-Objekte direkt in den Komponenten. Es gibt keinen einzigen
echten API-Aufruf – lediglich `console.log`-Platzhalter markieren die Stellen, an denen
Datenbanklogik hinmuss.

---

## Schichten-Analyse

### Was fehlt (Ausgangszustand)
- Kein Backend / keine API
- Kein Auth-System (Social-Buttons navigieren direkt weiter)
- Keine Datenbank (alle Daten sind hartkodierte Arrays)
- Kein Matching-Algorithmus
- Kein Realtime-Chat
- Kein Datei-Upload
- Keine Geolocation

### Was vorhanden ist
- Vollständiges React/TypeScript-Frontend mit shadcn-ui
- Alle UI-Seiten implementiert (Onboarding, Auth, Profile, Matching, Chat, GroupChat, Events)
- Deutsche UI-Texte durchgehend
- Responsive Mobile-First Layout
- Routing über React Router v6

---

## Die 9 konkreten Einstiegspunkte im Code

Diese Stellen sind die direkten Verbindungspunkte zwischen Frontend und Backend.
Alle waren im Ausgangszustand mit Mock-Daten oder `console.log` befüllt.

| # | Datei | Zeile (original) | Was fehlt | Jetzt implementiert |
|---|-------|------------------|-----------|---------------------|
| 1 | `Auth.tsx` | `handleSubmit()` | E-Mail/Passwort Auth | `supabase.auth.signInWithPassword/signUp` |
| 2 | `Auth.tsx` | `handleSocialAuth()` | Google/Facebook OAuth | `supabase.auth.signInWithOAuth` |
| 3 | `ProfileSetup.tsx` | `handleNext()` (letzter Schritt) | Profil in DB speichern | `supabase.from('profiles').upsert()` |
| 4 | `ProfileSetup.tsx` | Foto-Upload-Buttons | Dateien hochladen | `supabase.storage.from('photos').upload()` |
| 5 | `ProfileSetup.tsx` | *(fehlte komplett)* | Gruppengrößenpräferenz setzen | Neuer Schritt mit Slider ergänzt |
| 6 | `Matching.tsx` | Mock-Array `profiles[]` | Echte Profile aus DB laden | `supabase.rpc('get_potential_matches')` |
| 7 | `Matching.tsx` | `handleSwipe()` | Swipe in DB schreiben, Match erkennen | `supabase.rpc('process_swipe')` |
| 8 | `Chat.tsx` | Mock-Array `messages[]` | Nachrichten aus DB laden | `supabase.from('messages').select()` |
| 9 | `Chat.tsx` | `handleSendMessage()` | Nachricht in DB schreiben + Realtime | `supabase.from('messages').insert()` + Realtime-Channel |

---

## Detailbefunde pro Seite

### `Auth.tsx`
```typescript
// Ausgangszustand – kein echtes Auth
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  navigate("/profile-setup"); // direktes Weiterleiten ohne Auth
};

const handleSocialAuth = (provider: string) => {
  console.log(`Anmeldung mit ${provider}`); // Platzhalter
  navigate("/profile-setup");
};
```

### `ProfileSetup.tsx`
```typescript
// Ausgangszustand – kein Speichern
const handleNext = () => {
  if (currentStep < steps.length - 1) {
    setCurrentStep(currentStep + 1);
  } else {
    navigate("/matching"); // direkt weiter ohne Datenbankschreibvorgang
  }
};
```
**Zusätzlicher Fund:** Der Parameter `preferred_group_size` existiert in der Datenbank
und im Kalender-Feature (`maxParticipants`), hatte aber **keinen eigenen UI-Schritt** im
Profil-Wizard. Der Nutzer konnte seine Gruppengrößenpräferenz nicht setzen.
→ **Behoben:** Neuer Schritt "Gruppengröße" mit Slider (0 = Egal, 2–8 = konkret) eingefügt.

### `Matching.tsx`
```typescript
// Ausgangszustand – hartkodierte Mock-Profile
const profiles = [
  { id: 1, name: "Marcus", age: 34, description: "...", bike: "BMW R1250GS", ... },
  { id: 2, name: "Sarah",  age: 28, ... },
  { id: 3, name: "Thomas", age: 42, ... }
];

const handleSwipe = (direction: 'like' | 'pass') => {
  if (direction === 'like') {
    console.log(`Liked ${currentProfile.name}`); // kein Match-Check
  }
  // nächstes Profil anzeigen (Reset nach Ende)
};
```

### `Chat.tsx`
```typescript
// Ausgangszustand – hartkodierte Konversation
const [messages, setMessages] = useState([
  { id: 1, sender: "Marcus", content: "Hey! Schön, dass wir ein Match haben!", isOwn: false },
  { id: 2, sender: "Du", content: "Hi Marcus! ...", isOwn: true },
  // ...
]);

const handleSendMessage = () => {
  if (message.trim()) {
    // nur lokaler State-Update, keine DB-Persistenz
    setMessages([...messages, { id: ..., sender: "Du", content: message, isOwn: true }]);
    setMessage("");
  }
};
```

---

## Nicht analysierte Seiten (sekundärer Scope)

| Seite | Zustand | Nächster Schritt |
|-------|---------|------------------|
| `GroupChat.tsx` | Mock-Gruppen hartkodiert | `groups`/`group_messages` Tabellen anbinden |
| `Calendar.tsx`  | Mock-Events hartkodiert | `groups` Tabelle mit `event_date` verwenden |
| `Profile.tsx`   | Mock-Statistiken (24/8/12) | `get_user_stats()` RPC anbinden |
| `Index.tsx`     | Reines Onboarding, kein Datenbankbezug | Kein Handlungsbedarf |
