-- ============================================================
-- ride2gether – Vollständige Datenbank-Migration v2
-- PostGIS + pgcrypto + RLS + Matching-Funktionen
-- Ausführen im Supabase SQL Editor (einmalig)
-- ============================================================

-- ── 1. Erweiterungen ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 2. Tabellen ──────────────────────────────────────────────

-- Profile (verknüpft mit auth.users, angelegt via Trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             TEXT        UNIQUE,
  full_name            TEXT,
  age                  INTEGER     CHECK (age BETWEEN 18 AND 99),
  bio                  TEXT,
  motorcycle_brand     TEXT,
  motorcycle_model     TEXT,
  motorcycle_year      INTEGER,
  riding_style         TEXT        CHECK (riding_style IN ('entspannt','normal','sportlich','alle')),
  max_distance_km      INTEGER     DEFAULT 50  CHECK (max_distance_km BETWEEN 10 AND 200),
  preferred_group_size INTEGER     DEFAULT 0   CHECK (preferred_group_size BETWEEN 0 AND 8),
  avatar_url           TEXT,
  bike_photo_url       TEXT,
  is_active            BOOLEAN     DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Standorte (separat von profiles – häufige GPS-Updates)
CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id    UUID                   PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  location   GEOGRAPHY(POINT, 4326) NOT NULL,
  updated_at TIMESTAMPTZ            DEFAULT now()
);

-- GiST-Index: entscheidender Performance-Hebel für ST_DWithin()
CREATE INDEX IF NOT EXISTS idx_user_locations_gist
  ON public.user_locations USING GIST(location);

-- OAuth-Provider (Google / Facebook)
CREATE TABLE IF NOT EXISTS public.user_oauth_providers (
  id                       UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  UUID  REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider                 TEXT  NOT NULL CHECK (provider IN ('google','facebook')),
  provider_user_id         TEXT  NOT NULL,
  access_token_encrypted   TEXT,
  refresh_token_encrypted  TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

-- Swipes (jede Wisch-Entscheidung)
CREATE TABLE IF NOT EXISTS public.swipes (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id  UUID    REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id  UUID    REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction  TEXT    NOT NULL CHECK (direction IN ('like','pass')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

-- Matches (gegenseitige Likes, angelegt via process_swipe())
CREATE TABLE IF NOT EXISTS public.matches (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- LEAST/GREATEST-Sortierung verhindert (A,B) vs (B,A) Duplikate
  UNIQUE(user1_id, user2_id)
);

-- Nachrichten (1-zu-1, Realtime-aktiviert)
CREATE TABLE IF NOT EXISTS public.messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id   UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gruppen / Events
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  creator_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_members  INTEGER     DEFAULT 8,
  location     GEOGRAPHY(POINT, 4326),
  event_date   TIMESTAMPTZ,
  riding_style TEXT        CHECK (riding_style IN ('entspannt','normal','sportlich','alle')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Gruppen-Mitglieder
CREATE TABLE IF NOT EXISTS public.group_members (
  group_id  UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Gruppen-Nachrichten
CREATE TABLE IF NOT EXISTS public.group_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id   UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. Triggers ──────────────────────────────────────────────

-- Hilfsfunktion: updated_at automatisch setzen
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON public.user_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: Profil automatisch nach Registrierung anlegen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Matching-Funktion (drei harte Filter) ─────────────────

CREATE OR REPLACE FUNCTION public.get_potential_matches(
  p_user_id UUID,
  p_limit   INTEGER DEFAULT 10
)
RETURNS TABLE (
  id               UUID,
  full_name        TEXT,
  age              INTEGER,
  bio              TEXT,
  motorcycle_brand TEXT,
  motorcycle_model TEXT,
  riding_style     TEXT,
  avatar_url       TEXT,
  bike_photo_url   TEXT,
  distance_km      FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_location   GEOGRAPHY;
  v_style      TEXT;
  v_max_dist   INTEGER;
  v_group_size INTEGER;
BEGIN
  -- Sicherheit: nur eigene User-ID erlaubt
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  SELECT ul.location, p.riding_style, p.max_distance_km, p.preferred_group_size
  INTO   v_location,  v_style,        v_max_dist,        v_group_size
  FROM   public.profiles p
  LEFT JOIN public.user_locations ul ON ul.user_id = p.id
  WHERE  p.id = p_user_id;

  -- Kein Standort gesetzt → leeres Ergebnis (kein Absturz)
  IF v_location IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.age,
    p.bio,
    p.motorcycle_brand,
    p.motorcycle_model,
    p.riding_style,
    p.avatar_url,
    p.bike_photo_url,
    ST_Distance(ul.location, v_location) / 1000.0 AS distance_km
  FROM   public.profiles p
  JOIN   public.user_locations ul ON ul.user_id = p.id
  WHERE
    p.id          != p_user_id
    AND p.is_active = true
    -- Harter Filter 1: Distanz gegenseitig (beide müssen im Radius des anderen liegen)
    AND ST_DWithin(ul.location, v_location, v_max_dist * 1000)
    AND ST_DWithin(v_location,  ul.location, p.max_distance_km * 1000)
    -- Harter Filter 2: Fahrstil exakt ('alle' = Wildcard)
    AND (v_style = 'alle' OR p.riding_style = 'alle' OR p.riding_style = v_style)
    -- Harter Filter 3: Gruppengröße exakt (0 = Wildcard)
    AND (v_group_size = 0 OR p.preferred_group_size = 0 OR p.preferred_group_size = v_group_size)
    -- Bereits geswipt ausschließen
    AND p.id NOT IN (
      SELECT swiped_id FROM public.swipes WHERE swiper_id = p_user_id
    )
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

-- ── 5. Swipe-Funktion (atomare Transaktion, verhindert Race Conditions) ──────

CREATE OR REPLACE FUNCTION public.process_swipe(
  p_swiper_id UUID,
  p_swiped_id UUID,
  p_direction TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_match_exists BOOLEAN := false;
  v_match_id     UUID;
BEGIN
  -- Sicherheit: nur eigene User-ID als Swiper erlaubt
  IF p_swiper_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Selbst-Swipe verhindern
  IF p_swiper_id = p_swiped_id THEN
    RAISE EXCEPTION 'Ungültige Anfrage: Swipe auf sich selbst nicht erlaubt';
  END IF;

  -- Swipe eintragen (ON CONFLICT = idempotent, keine Fehler bei Doppel-Swipe)
  INSERT INTO public.swipes (swiper_id, swiped_id, direction)
  VALUES (p_swiper_id, p_swiped_id, p_direction)
  ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

  -- Bei Like: gegenseitigen Like prüfen
  IF p_direction = 'like' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.swipes
      WHERE  swiper_id = p_swiped_id
        AND  swiped_id = p_swiper_id
        AND  direction = 'like'
    ) INTO v_match_exists;

    IF v_match_exists THEN
      -- Match anlegen (LEAST/GREATEST = konsistente Reihenfolge, verhindert Duplikate)
      INSERT INTO public.matches (user1_id, user2_id)
      VALUES (LEAST(p_swiper_id, p_swiped_id), GREATEST(p_swiper_id, p_swiped_id))
      ON CONFLICT (user1_id, user2_id) DO NOTHING
      RETURNING id INTO v_match_id;

      RETURN jsonb_build_object('match', true, 'match_id', v_match_id);
    END IF;
  END IF;

  RETURN jsonb_build_object('match', false);
END;
$$;

-- ── 6. Row Level Security ─────────────────────────────────────

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aktive Profile lesen"        ON public.profiles FOR SELECT USING (is_active = true OR auth.uid() = id);
CREATE POLICY "Eigenes Profil anlegen"      ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Eigenes Profil aktualisieren" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_locations
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
-- Eigenen Standort immer lesen; fremde Standorte nur wenn ein Match besteht
-- (SECURITY DEFINER Funktionen umgehen RLS → Matching bleibt unberührt)
CREATE POLICY "Eigenen Standort lesen"      ON public.user_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Standort gematchter Nutzer"  ON public.user_locations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
      AND (m.user1_id = user_locations.user_id OR m.user2_id = user_locations.user_id)
  )
);
CREATE POLICY "Eigenen Standort verwalten"  ON public.user_locations FOR ALL    USING (auth.uid() = user_id);

-- user_oauth_providers
ALTER TABLE public.user_oauth_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Provider lesen"       ON public.user_oauth_providers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Eigene Provider anlegen"     ON public.user_oauth_providers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- swipes
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Swipes lesen"         ON public.swipes FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "Eigene Swipes anlegen"       ON public.swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigene Matches lesen"        ON public.matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match-Nachrichten lesen"     ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);
CREATE POLICY "Match-Nachrichten senden"    ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);
-- Keine Updates erlaubt (Nachrichten sind unveränderlich)
CREATE POLICY "Nachrichten nicht änderbar"  ON public.messages FOR UPDATE USING (false);
-- Nur eigene Nachrichten löschen (z.B. "Nachricht zurückziehen")
CREATE POLICY "Eigene Nachricht löschen"    ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alle Gruppen lesen"          ON public.groups FOR SELECT USING (true);
CREATE POLICY "Gruppe erstellen"            ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Eigene Gruppe bearbeiten"    ON public.groups FOR UPDATE USING (auth.uid() = creator_id);

-- group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mitglieder lesen"            ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Gruppe beitreten"            ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Gruppe verlassen"            ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- group_messages
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gruppen-Nachrichten lesen"   ON public.group_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Gruppen-Nachrichten senden"  ON public.group_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()
  )
);

-- ── 7. Realtime aktivieren ────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
-- Matches: Realtime damit beide Partner sofort benachrichtigt werden
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
