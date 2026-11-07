// Three routes, no data router. I push history myself and notify every
// useLocation through a listener set, which covers /, /login, /demo and
// /app/r/:id. `replace` is for auth redirects so Back doesn't bounce
// between /login and /app. The host rewrites every path except /assets
// to index.html, so a refresh on an IM url still boots this file.
import { useEffect, useState } from 'react'

const listeners = new Set<() => void>()

export function navigate(to: string, replace = false) {
  if (to === location.pathname + location.search) return
  if (replace) history.replaceState(null, '', to)
  else history.pushState(null, '', to)
  listeners.forEach((l) => l())
}

export function useLocation() {
  const [loc, setLoc] = useState(() => ({ path: location.pathname, search: location.search }))
  useEffect(() => {
    const on = () => setLoc({ path: location.pathname, search: location.search })
    listeners.add(on)
    window.addEventListener('popstate', on)
    return () => {
      listeners.delete(on)
      window.removeEventListener('popstate', on)
    }
  }, [])
  return loc
}
