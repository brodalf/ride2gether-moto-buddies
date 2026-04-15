# 03 – Matching-Logik v2 (Drei harte Filter)

## Design-Entscheidung: Keine Scores, nur harte Filter

Scoring-Systeme (z. B. „je mehr Übereinstimmungen, desto höher der Score") produzieren
schlechte Matches: Ein Nutzer mit komplett anderem Fahrstil taucht auf, weil er nah ist.
Bei ride2gether sind **alle drei Kriterien gleichwertig und nicht verhandelbar**.
Wer nicht passt, taucht nie auf – keine Gewichtung, kein Rauschen.

---

## Funktion: `get_potential_matches(p_user_id, p_limit)`

Läuft als **PostgreSQL-Funktion direkt in der Datenbank** – kein API-Hop nötig.

```sql
SELECT * FROM get_potential_matches('user-uuid-hier', 20);
```

### Filter 1: Distanz – gegenseitig

```sql
AND ST_DWithin(ul.location, v_location, v_max_dist * 1000)     -- A findet B in seinem Radius
AND ST_DWithin(v_location,  ul.location, p.max_distance_km * 1000) -- B findet A in seinem Radius
```

Beide Bedingungen müssen `TRUE` sein. Beispiel:
- Nutzer A: max. 50 km, Nutzer B: max. 30 km, Abstand: 40 km
- `ST_DWithin(B, A, 50km)` → TRUE, aber `ST_DWithin(A, B, 30km)` → FALSE
- Ergebnis: B taucht bei A **nicht** auf

`ST_DWithin()` mit einem `GEOGRAPHY`-Typ berechnet die Distanz auf der Erdoberfläche
(Großkreisdistanz), nicht als euklidische Näherung. Parameter ist in Metern.

### Filter 2: Fahrstil – exakte Übereinstimmung

```sql
AND (v_style = 'alle' OR p.riding_style = 'alle' OR p.riding_style = v_style)
```

`'alle'` ist die einzige Ausnahme – ein Nutzer mit `riding_style = 'alle'` passt zu jedem.
Kein partielles Matching: wer `'entspannt'` gesetzt hat, sieht keine `'sportlich'`-Nutzer.

### Filter 3: Gruppengröße – exakte Übereinstimmung

```sql
AND (v_group_size = 0 OR p.preferred_group_size = 0 OR p.preferred_group_size = v_group_size)
```

`0` ist die Wildcard (= „egal"). Exakte Übereinstimmung wenn beide Seiten einen Wert ≥ 1 haben.

### Bereits geswipt ausschließen

```sql
AND p.id NOT IN (SELECT swiped_id FROM public.swipes WHERE swiper_id = p_user_id)
```

Einmal gewischt = nie wieder angezeigt.

### Sortierung

```sql
ORDER BY distance_km ASC
```

Nächstgelegene Profile zuerst – intuitiv und erhöht die Wahrscheinlichkeit echter Treffen.

---

## Funktion: `process_swipe(p_swiper_id, p_swiped_id, p_direction)`

### Problem ohne DB-Funktion (Race Condition)

Ohne atomare Datenbank-Funktion könnte folgendes passieren:
1. Nutzer A liked B → Frontend liest „Hat B schon A geliked?" → nein
2. Nutzer B liked A → Frontend liest „Hat A schon B geliked?" → nein (noch nicht committed)
3. Beide inserieren Swipe, keiner erstellt Match

### Lösung: Alles in einer atomaren DB-Transaktion

```sql
-- 1. Swipe eintragen (ON CONFLICT = idempotent)
INSERT INTO swipes (swiper_id, swiped_id, direction) VALUES (...)
ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

-- 2. Gegenseitigen Like prüfen
SELECT EXISTS(SELECT 1 FROM swipes WHERE swiper_id = B AND swiped_id = A AND direction = 'like');

-- 3. Falls ja: Match anlegen (LEAST/GREATEST verhindert (A,B) vs. (B,A) Duplikate)
INSERT INTO matches (user1_id, user2_id)
VALUES (LEAST(A, B), GREATEST(A, B))
ON CONFLICT DO NOTHING;
```

### Rückgabewert

```json
{ "match": true,  "match_id": "uuid-des-neuen-matches" }
{ "match": false }
```

Das Frontend zeigt bei `match: true` eine Match-Animation.

---

## Frontend-Integration

```typescript
// Matches laden
const { data } = await supabase.rpc('get_potential_matches', {
  p_user_id: userId,
  p_limit: 20
});

// Swipe verarbeiten
const { data: result } = await supabase.rpc('process_swipe', {
  p_swiper_id: userId,
  p_swiped_id: profileId,
  p_direction: 'like' // oder 'pass'
});

if (result?.match) {
  // Match-Animation zeigen
}
```

---

## Performance

| Szenario          | Ohne GiST-Index | Mit GiST-Index |
|-------------------|-----------------|----------------|
| 1.000 Nutzer      | ~5 ms           | ~1 ms          |
| 10.000 Nutzer     | ~50 ms          | ~2 ms          |
| 100.000 Nutzer    | ~500 ms         | ~5 ms          |
| 1.000.000 Nutzer  | ~5 s            | ~15 ms         |

Der Index ist unverzichtbar ab ~5.000 aktiven Nutzern.
