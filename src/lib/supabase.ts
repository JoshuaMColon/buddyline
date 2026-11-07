// One browser client for the whole app. There is no API server: Auth,
// Postgres, Realtime and Storage all go through this.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

/**
 * Null when the build has no Supabase env (CI, a fresh clone). The
 * landing and sign-in pages still render and say so, instead of crashing.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Kept the key from when this was still called Aerogram, so a
          // session stored before the rename restores instead of signing everyone out.
          storageKey: 'aerogram:auth',
        },
        // Typing and presence are chatty. Cap the client so a busy room doesn't flood the socket.
        realtime: { params: { eventsPerSecond: 20 } },
      })
    : null

export const CLOUD = supabase !== null
