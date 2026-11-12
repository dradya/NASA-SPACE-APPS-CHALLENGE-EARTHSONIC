import { useEffect } from 'react'

/**
 * Single-key shortcuts that apply only when no control has focus, so they never fight with a screen reader's browse mode
 * or with native controls (a focused button keeps Space for itself). Keys: "space", "d", "m", "arrowleft", "arrowright".
 */
export function useShortcuts(handlers: Record<string, () => void>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, select, textarea, button, a, summary, [contenteditable="true"]')) return
      const key = e.key === ' ' ? 'space' : e.key.toLowerCase()
      const handler = handlers[key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
