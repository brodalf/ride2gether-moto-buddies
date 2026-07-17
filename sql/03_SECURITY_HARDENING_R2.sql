-- ============================================================
-- ride2gether – Security Hardening R2 (2026-05-09)
-- Ausführen im Supabase SQL Editor nach 01/02/06
-- Fixt: V92 (GPS-Fuzzing), V100 (RPC-Limits), V29 (Message-Length),
--       V83 (FOR UPDATE + GROUP BY), V83b (Creator-Leave-Bypass)
-- ============================================================

-- ── V92: GPS-Präzision auf 2 Dezimalstellen (≈1 km Unschärfe) ─
CREATE OR REPLACE FUNCTION public.update_user_location(
  p_user_id UUID,
  p_lat     FLOAT,
  p_lng     FLOAT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lat_fuzz FLOAT;
  v_lng_fuzz FLOAT;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Privacy: 2 Dezimalstellen ≈ 1.1 km Unschärfe (Standard Location-Privacy)
  v_lat_fuzz := round(p_lat::NUMERIC, 2)::FLOAT;
  v_lng_fuzz := round(p_lng::NUMERIC, 2)::FLOAT;

  INSERT INTO public.user_locations (user_id, location)
  VALUES (p_user_id, ST_MakePoint(v_lng_fuzz, v_lat_fuzz)::GEOGRAPHY)
  ON CONFLICT (user_id) DO UPDATE
    SET location   = EXCLUDED.location,
        updated_at = now();
END;
$$;

-- ── V100: Hard-Cap auf p_limit in RPC-Funktionen ─────────────
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
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- V100: DoS-Schutz – Hard-Cap
  p_limit := LEAST(GREATEST(p_limit, 1), 100);

  SELECT ul.location, p.riding_style, p.max_distance_km, p.preferred_group_size
  INTO   v_location,  v_style,        v_max_dist,        v_group_size
  FROM   public.profiles p
  LEFT JOIN public.user_locations ul ON ul.user_id = p.id
  WHERE  p.id = p_user_id;

  IF v_location IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.full_name, p.age, p.bio,
    p.motorcycle_brand, p.motorcycle_model,
    p.riding_style, p.avatar_url, p.bike_photo_url,
    ST_Distance(ul.location, v_location) / 1000.0 AS distance_km
  FROM   public.profiles p
  JOIN   public.user_locations ul ON ul.user_id = p.id
  WHERE
    p.id != p_user_id
    AND p.is_active = true
    AND ST_DWithin(ul.location, v_location, v_max_dist * 1000)
    AND ST_DWithin(v_location,  ul.location, p.max_distance_km * 1000)
    AND (v_style = 'alle' OR p.riding_style = 'alle' OR p.riding_style = v_style)
    AND (v_group_size = 0 OR p.preferred_group_size = 0 OR p.preferred_group_size = v_group_size)
    AND p.id NOT IN (
      SELECT swiped_id FROM public.swipes WHERE swiper_id = p_user_id
    )
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_events(
  p_limit  INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  description     TEXT,
  creator_id      UUID,
  creator_name    TEXT,
  max_members     INTEGER,
  member_count    BIGINT,
  is_member       BOOLEAN,
  location_text   TEXT,
  event_date      TIMESTAMPTZ,
  riding_style    TEXT,
  event_type      TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- V100: DoS-Schutz
  p_limit  := LEAST(GREATEST(p_limit, 1), 200);
  p_offset := GREATEST(p_offset, 0);

  RETURN QUERY
  SELECT
    g.id, g.name, g.description, g.creator_id,
    p.full_name AS creator_name,
    g.max_members,
    COUNT(gm.user_id) AS member_count,
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = g.id AND gm2.user_id = auth.uid()
    ) AS is_member,
    g.location_text, g.event_date, g.riding_style, g.event_type, g.created_at
  FROM   public.groups g
  LEFT JOIN public.profiles p        ON p.id = g.creator_id
  LEFT JOIN public.group_members gm  ON gm.group_id = g.id
  WHERE  g.event_date IS NULL OR g.event_date >= now()
  GROUP BY g.id, g.name, g.description, g.creator_id, p.full_name,
           g.max_members, g.location_text, g.event_date, g.riding_style,
           g.event_type, g.created_at
  ORDER BY
    CASE WHEN g.event_date IS NULL THEN 1 ELSE 0 END,
    g.event_date ASC NULLS LAST
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

-- ── V29: Length-Constraints auf Nachrichten (NOT VALID = kein Lock) ──
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS chk_messages_content_length;
ALTER TABLE public.messages
  ADD  CONSTRAINT chk_messages_content_length
    CHECK (char_length(content) BETWEEN 1 AND 2000) NOT VALID;
ALTER TABLE public.messages VALIDATE CONSTRAINT chk_messages_content_length;

ALTER TABLE public.group_messages
  DROP CONSTRAINT IF EXISTS chk_group_messages_content_length;
ALTER TABLE public.group_messages
  ADD  CONSTRAINT chk_group_messages_content_length
    CHECK (char_length(content) BETWEEN 1 AND 2000) NOT VALID;
ALTER TABLE public.group_messages VALIDATE CONSTRAINT chk_group_messages_content_length;

-- ── V83: join_event – FOR UPDATE ohne GROUP BY ──────────────
CREATE OR REPLACE FUNCTION public.join_event(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max     INTEGER;
  v_count   INTEGER;
  v_member  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) INTO v_member;

  IF v_member THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_member');
  END IF;

  -- V83: Zeile sperren OHNE Aggregat
  SELECT g.max_members INTO v_max
  FROM public.groups g
  WHERE g.id = p_group_id
  FOR UPDATE;

  IF v_max IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.group_members
  WHERE group_id = p_group_id;

  IF v_count >= v_max THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full');
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── V83b: Creator kann Gruppe nicht per REST-DELETE verlassen ────
DROP POLICY IF EXISTS "Gruppe verlassen" ON public.group_members;
CREATE POLICY "Gruppe verlassen"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );
