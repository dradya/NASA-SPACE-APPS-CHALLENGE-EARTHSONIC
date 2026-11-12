import { PageHeader } from '../components/PageHeader'
import { h2, panel } from '../components/ui'
import { MAPPINGS, SAFE_BAND } from '../core/mappings.ts'
import { PHENOMENA, PHENOMENON_IDS } from '../registry/phenomena.ts'

const STAGES = [
  ['1. Retrieve', 'A real NASA file is read: from a dated snapshot bundled with the app, or live from NASA, or from a file you choose. Files that are not what we expect are rejected with a clear message, never guessed at.'],
  ['2. Process', 'Values are parsed with their units, missing values stay missing, and yearly or monthly averages and rates of change are computed by documented recipes.'],
  ['3. Map to sound', 'Each measurement drives a sound dimension by a fixed rule (below). The rule is data, so the legend you read is the one the app plays.'],
  ['4. Play and show', 'One clock drives the picture, chart, numbers and sound together, so they always show the same moment. The sound can also be downloaded as a WAV file.'],
]

export function HowItWorksPage() {
  return (
    <>
      <PageHeader eyebrow="Method" title="How it works" lead="Every sound is a documented mapping from a real measurement. There are no random notes." />
      <section aria-labelledby="stages-h" className="mt-12">
        <h2 id="stages-h" className={h2}>From NASA file to sound</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {STAGES.map(([t, d]) => <li key={t} className={panel}><p className="font-display text-xl text-ink-100">{t}</p><p className="mt-2 text-sm text-ink-300">{d}</p></li>)}
        </ol>
      </section>
      <section aria-labelledby="rules-h" className="mt-12 max-w-3xl">
        <h2 id="rules-h" className={h2}>Our rules</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-ink-300">
          <li><strong className="text-ink-100">Reproducible.</strong> The same data and settings always produce the same notes and the same audio file. Each sonification shows a fingerprint you can compare.</li>
          <li><strong className="text-ink-100">Fixed scales.</strong> Pitch ranges are fixed for each quantity, not stretched to the dates you pick, so two periods can be compared by ear.</li>
          <li><strong className="text-ink-100">Honest gaps.</strong> Missing data is silence, and the text says so. Nothing is interpolated or invented.</li>
          <li><strong className="text-ink-100">Safe sound.</strong> Every pitch stays between {SAFE_BAND[0]} and {SAFE_BAND[1]} Hz and passes through a limiter. Volume starts moderate and fades in.</li>
          <li><strong className="text-ink-100">Rate of change is rhythm.</strong> A busier pulse means faster change. Playback speed is a separate control and never changes a pitch.</li>
          <li><strong className="text-ink-100">Demo data is labelled.</strong> If real data cannot load you may try the controls on a synthetic pattern, marked DEMO everywhere and never presented as NASA data.</li>
        </ul>
      </section>
      {PHENOMENON_IDS.map((id) => (
        <section key={id} aria-labelledby={`map-${id}`} className={`${panel} mt-8`}>
          <h2 id={`map-${id}`} className={h2}>{PHENOMENA[id].title}: what each sound means</h2>
          <p className="mt-1 text-sm text-ink-300">{PHENOMENA[id].datasetName}. {PHENOMENA[id].units}.</p>
          <ul className="mt-4 space-y-3 text-sm">
            {MAPPINGS[id].voices.map((v) => (
              <li key={v.id}><strong className="text-ink-100">{v.label}.</strong> <span className="text-ink-300">{v.role} {v.explain.join(' ')}</span></li>
            ))}
            {MAPPINGS[id].accent && <li><strong className="text-ink-100">Accent.</strong> <span className="text-ink-300">{MAPPINGS[id].accent?.explain}</span></li>}
            <li><strong className="text-ink-100">Time Travel difference.</strong> <span className="text-ink-300">{MAPPINGS[id].diff.explain}</span></li>
          </ul>
          <p className="mt-4 text-sm font-medium text-ink-100">Limitations</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-300">{PHENOMENA[id].limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      ))}
    </>
  )
}
