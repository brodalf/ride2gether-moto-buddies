-- ============================================================
-- ride2gether – Zusatz-Funktionen
-- Ausführen nach 01_MIGRATION.sql
-- ============================================================

-- Standort eines Nutzers aktualisieren (Upsert via lat/lng)
CREATE OR REPLACE FUNCTION public.update_user_location(
  p_user_id UUID,
  p_lat     FLOAT,
  p_lng     FLOAT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Sicherheit: nur eigene User-ID erlaubt
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  INSERT INTO public.user_locations (user_id, location)
  VALUES (p_user_id, ST_MakePoint(p_lng, p_lat)::GEOGRAPHY)
  ON CONFLICT (user_id) DO UPDATE
    SET location   = EXCLUDED.location,
        updated_at = now();
END;
$$;

-- Alle Matches eines Nutzers mit Profilinformationen und letzter Nachricht
CREATE OR REPLACE FUNCTION public.get_user_matches(p_user_id UUID)
RETURNS TABLE (
  match_id        UUID,
  matched_at      TIMESTAMPTZ,
  partner_id      UUID,
  partner_name    TEXT,
  partner_avatar  TEXT,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count    BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Sicherheit: nur eigene Matches abrufbar
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  RETURN QUERY
  SELECT
    m.id                                                                AS match_id,
    m.created_at                                                        AS matched_at,
    CASE WHEN m.user1_id = p_user_id THEN m.user2_id ELSE m.user1_id END AS partner_id,
    p.full_name                                                         AS partner_name,
    p.avatar_url                                                        AS partner_avatar,
    (
      SELECT msg.content FROM public.messages msg
      WHERE msg.match_id = m.id ORDER BY msg.created_at DESC LIMIT 1
    )                                                                   AS last_message,
    (
      SELECT msg.created_at FROM public.messages msg
      WHERE msg.match_id = m.id ORDER BY msg.created_at DESC LIMIT 1
    )                                                                   AS last_message_at,
    (
      SELECT COUNT(*) FROM public.messages msg
      WHERE msg.match_id = m.id
        AND msg.sender_id != p_user_id
        AND msg.read_at IS NULL
    )                                                                   AS unread_count
  FROM public.matches m
  JOIN public.profiles p ON p.id = CASE
    WHEN m.user1_id = p_user_id THEN m.user2_id
    ELSE m.user1_id
  END
  WHERE m.user1_id = p_user_id OR m.user2_id = p_user_id
  ORDER BY last_message_at DESC NULLS LAST;
END;
$$;

-- Nachrichten eines Matches als gelesen markieren
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_match_id UUID,
  p_user_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Sicherheit: nur eigene User-ID erlaubt
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Sicherheit: Nutzer muss Teil des Matches sein
  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = p_match_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Nicht autorisiert: Kein Teilnehmer dieses Matches';
  END IF;

  UPDATE public.messages
  SET    read_at = now()
  WHERE  match_id  = p_match_id
    AND  sender_id != p_user_id
    AND  read_at   IS NULL;
END;
$$;

-- Profil-Statistiken (Matches, Chats, gesendete Nachrichten)
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_matches BIGINT;
  v_chats   BIGINT;
  v_msgs    BIGINT;
BEGIN
  -- Sicherheit: nur eigene Statistiken abrufbar
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  SELECT COUNT(*)
  INTO   v_matches
  FROM   public.matches
  WHERE  user1_id = p_user_id OR user2_id = p_user_id;

  SELECT COUNT(DISTINCT match_id)
  INTO   v_chats
  FROM   public.messages
  WHERE  sender_id = p_user_id;

  SELECT COUNT(*)
  INTO   v_msgs
  FROM   public.messages
  WHERE  sender_id = p_user_id;

  RETURN jsonb_build_object(
    'matches',  v_matches,
    'chats',    v_chats,
    'messages', v_msgs
  );
END;
$$;

-- Mitglieder einer Gruppe mit Profildaten abrufen
CREATE OR REPLACE FUNCTION public.get_group_members_with_profiles(p_group_id UUID)
RETURNS TABLE (
  user_id    UUID,
  full_name  TEXT,
  avatar_url TEXT,
  role       TEXT,
  joined_at  TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Sicherheit: nur Gruppen-Mitglieder dürfen die Mitgliederliste sehen
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Nicht autorisiert: Kein Mitglied dieser Gruppe';
  END IF;

  RETURN QUERY
  SELECT
    gm.user_id,
    p.full_name,
    p.avatar_url,
    gm.role,
    gm.joined_at
  FROM   public.group_members gm
  JOIN   public.profiles p ON p.id = gm.user_id
  WHERE  gm.group_id = p_group_id
  ORDER  BY gm.joined_at ASC;
END;
$$;

-- Eigenes Konto löschen (löscht Profil + löst CASCADE auf alle Daten aus)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
