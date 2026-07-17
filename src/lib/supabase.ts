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
  full_name: string | null
  age: number | null
  bio: string | null
  motorcycle_brand: string | null
  motorcycle_model: string | null
  riding_style: RidingStyle | null
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

export type EventType = 'tour' | 'sportlich' | 'entspannt' | 'social'

export interface Event {
  id: string
  name: string
  description: string | null
  creator_id: string
  creator_name: string | null
  max_members: number
  member_count: number
  is_member: boolean
  location_text: string | null
  event_date: string | null
  riding_style: RidingStyle | null
  event_type: EventType | null
  created_at: string
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

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * EXIF-Metadaten (inkl. GPS-Koordinaten) durch Canvas-Roundtrip entfernen.
 * Fallback: original File wenn Browser Canvas/Bitmap nicht unterstützt.
 */
async function stripExif(file: File): Promise<File> {
  try {
    if (typeof createImageBitmap !== 'function') return file

    const bitmap = await createImageBitmap(file)
    const useOffscreen = typeof OffscreenCanvas !== 'undefined'
    const canvas: OffscreenCanvas | HTMLCanvasElement = useOffscreen
      ? new OffscreenCanvas(bitmap.width, bitmap.height)
      : Object.assign(document.createElement('canvas'), {
          width: bitmap.width,
          height: bitmap.height,
        })

    const ctx = (canvas as HTMLCanvasElement).getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0)

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob: Blob = useOffscreen
      ? await (canvas as OffscreenCanvas).convertToBlob({ type: outType, quality: 0.92 })
      : await new Promise<Blob>((resolve, reject) => {
          ;(canvas as HTMLCanvasElement).toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
            outType,
            0.92,
          )
        })

    return new File([blob], file.name, { type: blob.type })
  } catch (err) {
    console.warn('EXIF-Strip fehlgeschlagen, verwende Original:', err)
    return file
  }
}

/** Foto in den Supabase Storage Bucket 'photos' hochladen */
export async function uploadPhoto(
  userId: string,
  file: File,
  type: 'avatar' | 'bike'
): Promise<string | null> {
  // Dateigröße prüfen
  if (file.size > MAX_FILE_SIZE_BYTES) {
    console.error('Upload abgelehnt: Datei zu groß', file.size)
    return null
  }

  // MIME-Typ prüfen
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    console.error('Upload abgelehnt: Ungültiger Dateityp', file.type)
    return null
  }

  // V58: EXIF-Metadaten (GPS-Koordinaten) entfernen
  const safeFile = await stripExif(file)

  // Pfad enthält userId → Supabase Storage RLS kann ihn darüber schützen
  const ext = safeFile.type === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/${type}_${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('photos').upload(path, safeFile, {
    upsert: true,
    contentType: safeFile.type,
  })

  if (error) {
    console.error('Upload-Fehler:', error)
    return null
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data.publicUrl
}
