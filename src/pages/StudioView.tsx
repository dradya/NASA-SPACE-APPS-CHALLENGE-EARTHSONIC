import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnnounce } from '../a11y/Announcer'
import { useShortcuts } from '../a11y/useShortcuts'
import { AudioScope } from '../components/AudioScope'
import { CaptionPanel } from '../components/CaptionPanel'
import { ScienceCard } from '../components/ScienceCard'
import { TransportControls } from '../components/TransportControls'
import { btn, field, h2, panel } from '../components/ui'
import { describeStep, formatValue, plainValue } from '../core/describe.ts'
import { MAPPINGS } from '../core/mappings.ts'
import { milestonesFor } from '../core/milestones.ts'
import { buildScore } from '../core/score.ts'
import { encodeWav16, renderScore } from '../core/wav.ts'
import type { Dataset, ListeningMode } from '../core/types.ts'
import type { PhenomenonInfo, Site } from '../registry/phenomena.ts'
import { usePlayer } from '../state/usePlayer'
import { ImageryPanel } from '../viz/ImageryPanel'
import { PhenomenonVisual } from '../viz/PhenomenonVisual'
import { TimeSeriesChart } from '../viz/TimeSeriesChart'

const STATUS_TEXT: Record<string, string> = { playing: 'Playing', paused: 'Paused', ready: 'Stopped', error: 'Audio could not start' }

export function downloadWav(bytes: Uint8Array, name: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/wav' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  info: PhenomenonInfo
  dataset: Dataset
  site: Site | null
}

/** The Sonification Studio for one loaded dataset: picture, chart, numbers, sound, caption and transparency, all on the same step. */
export function StudioView({ info, dataset, site }: Props) {
  const spec = MAPPINGS[info.id]
  const player = usePlayer()
  const announce = useAnnounce()
  const n = dataset.steps.length
  const [from, setFrom] = useState(0)
  const [toIncl, setToIncl] = useState(n - 1)
  const [mode, setMode] = useState<ListeningMode>('scientific')
  const [live, setLive] = useState(false)
  const { controller, state } = player

  const score = useMemo(() => buildScore(dataset, spec, { from, to: toIncl + 1 }, { mode, intensity: 0.5 }), [dataset, spec, from, toIncl, mode])
  useEffect(() => { controller.setScore(score) }, [controller, score])

  const g = Math.min(from + state.step, toIncl)
  const desc = useMemo(() => describeStep(dataset, spec, g, { mode, intensity: 0.5 }), [dataset, spec, g, mode])
  const labels = useMemo(() => dataset.steps.slice(from, toIncl + 1).map((s) => s.label), [dataset, from, toIncl])
  const milestones = useMemo(() => milestonesFor(dataset, spec).filter((m) => m.step >= from && m.step <= toIncl), [dataset, spec, from, toIncl])

  const prevStatus = useRef(state.status)
  useEffect(() => {
    if (prevStatus.current !== state.status && prevStatus.current !== 'idle') announce(STATUS_TEXT[state.status] ?? '')
    prevStatus.current = state.status
  }, [state.status, announce])
  useEffect(() => { if (live && state.status === 'playing') announce(desc.text) }, [live, state.status, desc.text, announce])

  const describeNow = () => announce(desc.text)
  const toggle = () => (state.status === 'playing' ? controller.pause() : void controller.play())
  useShortcuts({
    space: toggle, d: describeNow, m: () => { const next = mode === 'scientific' ? 'musical' : 'scientific'; setMode(next); controller.setMode(next) },
    arrowleft: () => controller.seek(state.step - 1), arrowright: () => controller.seek(state.step + 1),
  })

  const pitchMeasures = [...new Set(spec.voices.flatMap((v) => (v.pitch ? [v.pitch.measure] : [])))].filter((id) => dataset.measures[id] && id !== 'change')
  const series = pitchMeasures.map((id) => ({ id, label: dataset.measures[id].label, units: dataset.measures[id].units, values: dataset.measures[id].values.slice(from, toIncl + 1) }))
  const rate = dataset.measures.rate ?? dataset.measures.change
  const first = labels[0]
  const last = labels[labels.length - 1]
  const prim = dataset.measures[dataset.primary]
  const latest = prim.values[toIncl]

  const iso = dataset.steps[g]?.iso ?? ''
  const dl = () => downloadWav(encodeWav16(renderScore(score, { intensity: state.intensity })), `earthsonic-${info.id}-${score.fingerprint}.wav`)

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className={panel} aria-label="Picture and chart">
            <h2 className={h2}>The picture</h2>
            <p className="mt-1 text-sm text-ink-300">{info.visual.description}</p>
            <div className="mt-4"><PhenomenonVisual info={info} dataset={dataset} step={g} from={from} to={toIncl + 1} /></div>
            {info.imagery && iso && <div className="mt-4"><ImageryPanel key={`${site?.id}-${iso.slice(0, 7)}`} imagery={info.imagery} iso={iso} site={site} /></div>}
            <div className="mt-6">
              <TimeSeriesChart
                title={`${info.title}: ${first} to ${last}`}
                summary={`${series.map((s) => s.label).join(', ')} from ${first} to ${last}. The latest value is ${latest === null ? 'missing' : prim.units.startsWith('°C vs') ? plainValue(prim.units, latest) : formatValue(latest, prim.units)}. The marker shows ${labels[state.step] ?? ''}.`}
                labels={labels} series={series} step={state.step}
              />
            </div>
            {rate && (
              <div className="mt-6">
                <TimeSeriesChart title={rate.label} summary={`${rate.label} (${rate.units}); drives the pulse rhythm.`} labels={labels} series={[{ id: rate.id, label: rate.label, units: rate.units, values: rate.values.slice(from, toIncl + 1) }]} step={state.step} />
              </div>
            )}
          </section>
          <section className={panel} aria-label="Measurements at this moment">
            <h2 className={h2}>Measurements at {dataset.steps[g]?.label}</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {Object.values(dataset.measures).map((m) => {
                const v = m.values[g]
                return (
                  <div key={m.id}>
                    <dt className="text-xs text-ink-300">{m.label}</dt>
                    <dd className="text-sm text-ink-100">{v === null ? 'no data' : m.units.startsWith('°C vs') ? plainValue(m.units, v) : formatValue(v, m.units)}</dd>
                  </div>
                )
              })}
            </dl>
          </section>
        </div>
        <div className="space-y-6">
          <section className={panel} aria-label="Player">
            <h2 className={h2}>Listen</h2>
            {info.id !== 'vegetation' && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-sm text-ink-300">From
                  <select className={`${field} ml-2`} value={from} onChange={(e) => { const v = Number(e.target.value); setFrom(v); if (v > toIncl) setToIncl(v) }}>
                    {dataset.steps.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
                  </select>
                </label>
                <label className="text-sm text-ink-300">To
                  <select className={`${field} ml-2`} value={toIncl} onChange={(e) => setToIncl(Number(e.target.value))}>
                    {dataset.steps.map((s, i) => (i >= from ? <option key={s.label} value={i}>{s.label}</option> : null))}
                  </select>
                </label>
                <button type="button" className={btn} onClick={() => { setFrom(0); setToIncl(n - 1) }}>Whole record</button>
              </div>
            )}
            <div className="mt-4"><TransportControls player={player} stepLabels={score.stepLabels} mode={mode} onMode={(m) => { setMode(m); controller.setMode(m) }} /></div>
            {milestones.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-ink-300">Jump to a milestone (computed from the data)</p>
                <ul className="flex flex-wrap gap-2">
                  {milestones.map((m) => <li key={m.step}><button type="button" className={btn} onClick={() => controller.seek(m.step - from)}>{m.label}<span className="sr-only">: {m.reason}</span></button></li>)}
                </ul>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={btn} onClick={dl}>Download this sonification (WAV)</button>
              <p className="text-xs text-ink-300">Sound fingerprint <code>{score.fingerprint}</code>: the same data and settings always give the same sound.</p>
            </div>
          </section>
          <CaptionPanel headline={desc.headline} lines={desc.lines} live={live} onLive={setLive} onDescribe={describeNow} />
          <section className={panel} aria-label="Live sound display"><h2 className={h2}>The sound itself</h2><div className="mt-3"><AudioScope source={player.backend} active={state.status === 'playing'} /></div></section>
        </div>
      </div>
      <ScienceCard info={info} dataset={dataset} legend={score.legend} />
    </div>
  )
}
