-- ============================================================
-- ride2gether – Events/Gruppen Erweiterung
-- Ausführen im Supabase SQL Editor nach 01_MIGRATION.sql
-- ============================================================

-- ── 1. location_text Spalte hinzufügen ───────────────────────
-- Ermöglicht Freitext-Ortsangabe ("Baden-Baden", "Garmisch...").
-- Die bestehende GEOGRAPHY-Spalte bleibt für spätere Kartenintegration.
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS location_text TEXT,
  ADD COLUMN IF NOT EXISTS event_type    TEXT DEFAULT 'tour'
    CHECK (event_type IN ('tour','sportlich','entspannt','social'));

-- ── 2. Funktion: Events mit Teilnehmeranzahl laden ────────────
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
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.description,
    g.creator_id,
    p.full_name          AS creator_name,
    g.max_members,
    COUNT(gm.user_id)    AS member_count,
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = g.id AND gm2.user_id = auth.uid()
    )                    AS is_member,
    g.location_text,
    g.event_date,
    g.riding_style,
    g.event_type,
    g.created_at
  FROM   public.groups g
  LEFT JOIN public.profiles p        ON p.id = g.creator_id
  LEFT JOIN public.group_members gm  ON gm.group_id = g.id
  -- Nur zukünftige Events oder Events ohne Datum anzeigen
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

-- ── 3. Funktion: Event beitreten (atomare Prüfung max_members) ─
CREATE OR REPLACE FUNCTION public.join_event(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_max     INTEGER;
  v_count   INTEGER;
  v_member  BOOLEAN;
BEGIN
  -- Bereits Mitglied?
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) INTO v_member;

  IF v_member THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_member');
  END IF;

  -- Kapazität prüfen (atomar – kein Race Condition zwischen SELECT und INSERT)
  SELECT g.max_members, COUNT(gm.user_id)
  INTO   v_max, v_count
  FROM   public.groups g
  LEFT JOIN public.group_members gm ON gm.group_id = g.id
  WHERE  g.id = p_group_id
  GROUP BY g.max_members
  FOR UPDATE;  -- Zeile sperren während wir prüfen

  IF v_count >= v_max THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full');
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (p_group_id, auth.uid(), 'member')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 4. Funktion: Event verlassen ──────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_event(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Creator darf nicht verlassen (er muss zuerst das Event löschen)
  IF EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND creator_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'creator_cannot_leave');
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = auth.uid();

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 5. RLS: Eigene Gruppe löschen erlauben ───────────────────
CREATE POLICY IF NOT EXISTS "Eigene Gruppe löschen"
  ON public.groups FOR DELETE USING (auth.uid() = creator_id);
