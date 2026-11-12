import { useId } from 'react'
import { btn, panel } from './ui'

interface Props {
  headline: string
  lines: string[]
  live: boolean
  onLive: (v: boolean) => void
  onDescribe: () => void
}

/** A text version of what is sounding right now. Optional live announcements are OFF by default so speech does not talk over the sound. */
export function CaptionPanel({ headline, lines, live, onLive, onDescribe }: Props) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={panel}>
      <h2 id={id} className="font-display text-2xl font-light text-ink-100">What you are hearing</h2>
      <p className="mt-2 font-medium text-signal">{headline}</p>
      <div aria-live={live ? 'polite' : 'off'} aria-atomic="true">
        <ul className="mt-2 space-y-1 text-sm text-ink-100">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" className={btn} onClick={onDescribe}>Describe this moment</button>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-100">
          <input type="checkbox" className="h-5 w-5" checked={live} onChange={(e) => onLive(e.target.checked)} />
          Announce each step to my screen reader
        </label>
      </div>
    </section>
  )
}
