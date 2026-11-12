import { useId } from 'react'
import { SPEEDS } from '../core/playback.ts'
import type { ListeningMode } from '../core/types.ts'
import type { Player } from '../state/usePlayer'
import { btn, btnPrimary, field, muted } from './ui'

interface Props {
  player: Player
  stepLabels: string[]
  mode: ListeningMode
  onMode: (m: ListeningMode) => void
  disabled?: boolean
}

/** Play, pause, stop, loop, speed, volume, intensity, listening mode and a timeline slider. Every control is a native, labelled element. */
export function TransportControls({ player, stepLabels, mode, onMode, disabled = false }: Props) {
  const { controller, state } = player
  const id = useId()
  const playing = state.status === 'playing'
  const last = Math.max(0, state.stepCount - 1)
  const label = stepLabels[state.step] ?? ''

  return (
    <div className="space-y-4" role="group" aria-label="Playback controls">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnPrimary} disabled={disabled || state.stepCount === 0} onClick={() => (playing ? controller.pause() : void controller.play())}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className={btn} disabled={disabled || state.status === 'idle'} onClick={() => controller.stop()}>Stop</button>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-100">
          <input type="checkbox" className="h-5 w-5" checked={state.loop} onChange={(e) => controller.setLoop(e.target.checked)} />
          Loop
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-ink-100" htmlFor={`${id}-speed`}>
          Speed
          <select id={`${id}-speed`} className={field} value={state.speed} onChange={(e) => controller.setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
      </div>
      <div>
        <label htmlFor={`${id}-time`} className="mb-1 block text-sm text-ink-300">
          Timeline: <span className="text-ink-100">{label || 'no data'}</span>
        </label>
        <input
          id={`${id}-time`} type="range" min={0} max={last} step={1} value={Math.min(state.step, last)} disabled={disabled || state.stepCount < 2}
          aria-valuetext={`${label}, step ${state.step + 1} of ${state.stepCount}`}
          onChange={(e) => controller.seek(Number(e.target.value))} className="w-full accent-signal"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${id}-vol`} className="text-sm text-ink-100">
          Volume <span className={muted}>({Math.round(state.volume * 100)}%)</span>
          <input id={`${id}-vol`} type="range" min={0} max={1} step={0.05} value={state.volume} onChange={(e) => controller.setVolume(Number(e.target.value))} className="mt-1 w-full accent-signal" />
        </label>
        <label htmlFor={`${id}-int`} className="text-sm text-ink-100">
          Intensity <span className={muted}>({Math.round(state.intensity * 100)}%; changes loudness and brightness contrast, never pitch)</span>
          <input id={`${id}-int`} type="range" min={0} max={1} step={0.05} value={state.intensity} onChange={(e) => controller.setIntensity(Number(e.target.value))} className="mt-1 w-full accent-signal" />
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm text-ink-300">Listening mode</legend>
        <div className="flex flex-wrap gap-5 text-sm text-ink-100">
          {(['scientific', 'musical'] as const).map((m) => (
            <label key={m} className="inline-flex min-h-11 items-center gap-2">
              <input type="radio" name={`${id}-mode`} className="h-5 w-5" checked={mode === m} onChange={() => onMode(m)} />
              {m === 'scientific' ? 'Scientific (continuous pitch)' : 'Musical (pentatonic notes)'}
            </label>
          ))}
        </div>
      </fieldset>
      {state.status === 'error' && <p role="alert" className="text-sm text-ember">Audio could not start: {state.error}</p>}
      <p className={muted}>Keyboard: Space plays or pauses, ← → step through time, D describes the moment, M switches listening mode (when no control has focus).</p>
    </div>
  )
}
