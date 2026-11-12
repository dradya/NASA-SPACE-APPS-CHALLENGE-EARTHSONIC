import { useCallback, useState } from 'react'
import { applyContrast, currentContrast, storeContrast, type ContrastMode } from './contrast'

export function useContrast(): { mode: ContrastMode; high: boolean; toggle: () => void } {
  const [mode, setMode] = useState<ContrastMode>(() => currentContrast())

  const toggle = useCallback(() => {
    const next: ContrastMode = mode === 'high' ? 'normal' : 'high'
    applyContrast(next)
    storeContrast(next)
    setMode(next)
  }, [mode])

  return { mode, high: mode === 'high', toggle }
}
