import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Announce = (message: string) => void
const AnnouncerContext = createContext<Announce>(() => undefined)

/** One polite live region for the whole app (loading finished, playback started, errors). Screen readers read changes aloud. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [tick, setTick] = useState(0)
  const announce = useCallback<Announce>((m) => {
    setMessage(m)
    setTick((t) => t + 1) // a changed key makes repeated identical messages be read again
  }, [])
  const value = useMemo(() => announce, [announce])
  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" key={tick}>
        {message}
      </div>
    </AnnouncerContext.Provider>
  )
}

export function useAnnounce(): Announce {
  return useContext(AnnouncerContext)
}
