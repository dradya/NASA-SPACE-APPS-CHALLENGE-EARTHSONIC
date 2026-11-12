import { useEffect, useState, useSyncExternalStore } from 'react'
import { ToneBackend } from '../audio/toneBackend'
import { PlaybackController } from '../core/playback.ts'
import type { PlaybackState } from '../core/types.ts'

export interface Player {
  controller: PlaybackController
  backend: ToneBackend
  state: PlaybackState
}

/** One audio engine and playback controller for a page. Pauses when the tab is hidden (browsers throttle timers in background tabs, which would make the sound stutter). */
export function usePlayer(): Player {
  const [{ controller, backend }] = useState(() => {
    const backend = new ToneBackend()
    const controller = new PlaybackController(backend, { setInterval: (fn, ms) => window.setInterval(fn, ms), clearInterval: (h) => window.clearInterval(h as number) })
    return { controller, backend }
  })
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState)

  useEffect(() => {
    const onHidden = () => { if (document.hidden) controller.pause() }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      controller.dispose()
      backend.dispose()
    }
  }, [controller, backend])

  return { controller, backend, state }
}
