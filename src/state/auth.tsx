// Session and profile for the whole tree. Supabase owns the token
// (localStorage plus refresh); I only mirror the Session into React and
// make sure a chat.profiles row exists before the messenger mounts.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ensureProfile } from '../lib/api'
import type { Profile } from '../lib/types'

interface AuthState {
  ready: boolean
  session: Session | null
  isGuest: boolean
  profile: Profile | null
  profileError: string | null
  setProfile: (p: Profile) => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

// chat_ensure_profile creates the row, the default groups, and Pip's
// welcome IM. One in-flight promise per user so StrictMode's double
// effect doesn't fire that RPC twice.
let ensuring: { uid: string; p: Promise<Profile> } | null = null

export function AuthProvider({ children }: { children: ReactNode }) {
  // No backend: start ready so /login can explain itself instead of spinning.
  const [ready, setReady] = useState(!supabase)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    // getSession reads the stored token. onAuthStateChange covers sign-in,
    // sign-out, and later token refreshes.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id ?? null
  useEffect(() => {
    if (!supabase || !uid || !session) return
    let live = true
    // The screen name from sign-up sits in user metadata until the profile
    // row exists. Guests pass null and the database invents one.
    const name = (session.user.user_metadata?.display_name as string | undefined) ?? null
    if (!ensuring || ensuring.uid !== uid) ensuring = { uid, p: ensureProfile(supabase, name) }
    ensuring.p
      .then((p) => live && (setProfile(p), setProfileError(null)))
      .catch((e: Error) => {
        ensuring = null
        if (live) setProfileError(e.message)
      })
    return () => {
      live = false
    }
    // Only re-run when the user changes, not on every token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    // Drop the in-flight ensure so the next sign-in starts clean.
    ensuring = null
    setProfile(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      // Anonymous sign-in (the /demo flow) is a real user. is_anonymous
      // is how I tell a guest apart from an email account.
      isGuest: !!session?.user.is_anonymous,
      // Hide a profile that still belongs to the previous user while the
      // new ensureProfile call is in flight.
      profile: profile && profile.id === uid ? profile : null,
      profileError,
      setProfile,
      signOut,
    }),
    [ready, session, uid, profile, profileError, signOut],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
