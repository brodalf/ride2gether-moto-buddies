import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Fehlende Supabase-Umgebungsvariablen. ' +
    'Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in der .env Datei setzen.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Typen ─────────────────────────────────────────────────────────────────────

export type RidingStyle = 'entspannt' | 'normal' | 'sportlich' | 'alle'

export interface Profile {
  id: string
  username?: string
  full_name?: string
  age?: number
  bio?: string
  motorcycle_brand?: string
  motorcycle_model?: string
  motorcycle_year?: number
  riding_style?: RidingStyle
  max_distance_km?: number
  preferred_group_size?: number
  avatar_url?: string
  bike_photo_url?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface PotentialMatch {
  id: string
  full_name: string
  age: number
  bio: string
  motorcycle_brand: string
  motorcycle_model: string
  riding_style: RidingStyle
  avatar_url: string | null
  bike_photo_url: string | null
  distance_km: number
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
}

export interface UserMatch {
  match_id: string
  matched_at: string
  partner_id: string
  partner_name: string
  partner_avatar: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

/** Standort des aktuellen Nutzers in der Datenbank aktualisieren */
export async function updateUserLocation(userId: string, lat: number, lng: number) {
  return supabase.rpc('update_user_location', {
    p_user_id: userId,
    p_lat: lat,
    p_lng: lng,
  })
}

/** Foto in den Supabase Storage Bucket 'photos' hochladen */
export async function uploadPhoto(
  userId: string,
  file: File,
  type: 'avatar' | 'bike'
): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${type}_${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('photos').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    console.error('Upload-Fehler:', error)
    return null
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data.publicUrl
}
