import { useEffect, useMemo, useRef, useState } from 'react'
import { useAnnounce } from '../a11y/Announcer'
import { useShortcuts } from '../a11y/useShortcuts'
import { AudioScope } from '../components/AudioScope'
import { CaptionPanel } from '../components/CaptionPanel'
import { ScienceCard } from '../components/ScienceCard'
import { TransportControls } from '../components/TransportControls'
import { btn, field, h2, panel } from '../components/ui'
import { buildComparisonScore, comparePeriods, describeComparison, momentText, type ComparisonMode } from '../core/compare.ts'
import { formatNumber } from '../core/series.ts'
import { MAPPINGS } from '../core/mappings.ts'
import { encodeWav16, renderScore } from '../core/wav.ts'
import type { Dataset, ListeningMode } from '../core/types.ts'
import type { PhenomenonInfo } from '../registry/phenomena.ts'
import { usePlayer } from '../state/usePlayer'
import { DiffBars } from '../viz/DiffBars'
import { TimeSeriesChart } from '../viz/TimeSeriesChart'
import { downloadWav } from './StudioView'

const LENGTHS = [5, 10, 20, 30]
const MODES: { id: ComparisonMode; label: string; help: string }[] = [
  { id: 'sequential', label: 'A, then B', help: 'Hear period A, a moment of silence, then period B, on the same pitch scale.' },
  { id: 'together', label: 'A and B together', help: 'Period A in your left ear and period B in your right, position by position.' },
  { id: 'difference', label: 'Only the difference', help: 'One voice plays B minus A. Above the quiet reference tone means B is higher.' },
]
const STATUS_TEXT: Record<string, string> = { playing: 'Playing', paused: 'Paused', ready: 'Stopped', error: 'Audio could not start' }

interface Props {
  info: PhenomenonInfo
  dsA: Dataset
  /** Same object as dsA for phenomena with a long record (compare two periods of it); a different year's data for vegetation. */
  dsB: Dataset
}

export function TimeTravelView({ info, dsA, dsB }: Props) {
  const spec = MAPPINGS[info.id]
  const player = usePlayer()
  const announce = useAnnounce()
  const annual = info.id !== 'vegetation'
  const n = dsA.steps.length
  const [lenSel, setLenSel] = useState(Math.min(10, n))
  const [startA, setStartA] = useState(0)
  const [startB, setStartB] = useState(Math.max(0, n - Math.min(10, n)))
  const [cmode, setCmode] = useState<ComparisonMode>('sequential')
  const [mode, setMode] = useState<ListeningMode>('scientific')
  const [live, setLive] = useState(false)
  const { controller, state } = player

  const len = annual ? Math.min(lenSel, n) : n
  const sa = annual ? Math.min(startA, n - len) : 0
  const sb = annual ? Math.min(startB, n - len) : 0
  const rA = useMemo(() => ({ from: sa, to: sa + len }), [sa, len])
  const rB = useMemo(() => (annual ? { from: sb, to: sb + len } : { from: 0, to: dsB.steps.length }), [annual, sb, len, dsB])

  const comparison = useMemo(() => comparePeriods(dsA, rA, dsB, rB, spec.diff.measure), [dsA, dsB, rA, rB, spec])
  const score = useMemo(() => buildComparisonScore(cmode, dsA, rA, dsB, rB, spec, { mode, intensity: 0.5 }), [cmode, dsA, dsB, rA, rB, spec, mode])
  useEffect(() => { controller.setScore(score) }, [controller, score])

  const moment = momentText(comparison, cmode, state.step, rA.to - rA.from)
  const summary = describeComparison(comparison)
  const prev = useRef(state.status)
  useEffect(() => {
    if (prev.current !== state.status && prev.current !== 'idle') announce(STATUS_TEXT[state.status] ?? '')
    prev.current = state.status
  }, [state.status, announce])
  useEffect(() => { if (live && state.status === 'playing') announce(moment) }, [live, state.status, moment, announce])
  const describeNow = () => announce(`${moment} ${summary}`)
  useShortcuts({
    space: () => (state.status === 'playing' ? controller.pause() : void controller.play()), d: describeNow,
    m: () => { const next = mode === 'scientific' ? 'musical' : 'scientific'; setMode(next); controller.setMode(next) },
    arrowleft: () => controller.seek(state.step - 1), arrowright: () => controller.seek(state.step + 1),
  })

  const positions = Array.from({ length: comparison.length }, (_, i) => String(i + 1))
  const rowLabels = positions.map((_, i) => `A ${comparison.labelsA[i] ?? '—'} · B ${comparison.labelsB[i] ?? '—'}`)
  const m = dsA.measures[comparison.measure]
  const fmt = (v: number | null, d = 2) => (v === null ? 'n/a' : formatNumber(v, d))
  const stepOptions = (max: number) => dsA.steps.map((s, i) => (i <= max ? <option key={s.label} value={i}>{s.label}</option> : null))
  const dl = () => downloadWav(encodeWav16(renderScore(score, { intensity: state.intensity })), `earthsonic-${info.id}-compare-${cmode}-${score.fingerprint}.wav`)

  return (
    <div className="mt-8 space-y-6">
      {annual && (
        <section className={panel} aria-label="Choose the two periods">
          <h2 className={h2}>Choose two periods</h2>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label className="text-sm text-ink-300">Length
              <select className={`${field} ml-2`} value={len} onChange={(e) => setLenSel(Number(e.target.value))}>
                {[...new Set([...LENGTHS.filter((l) => l <= n), Math.min(n, 10)])].sort((a, b) => a - b).map((l) => <option key={l} value={l}>{l} {info.stepNoun}s</option>)}
              </select>
            </label>
            <label className="text-sm text-ink-300">Period A starts
              <select className={`${field} ml-2`} value={sa} onChange={(e) => setStartA(Number(e.target.value))}>{stepOptions(n - len)}</select>
            </label>
            <label className="text-sm text-ink-300">Period B starts
              <select className={`${field} ml-2`} value={sb} onChange={(e) => setStartB(Number(e.target.value))}>{stepOptions(n - len)}</select>
            </label>
            <button type="button" className={btn} onClick={() => { setStartA(0); setStartB(Math.max(0, n - len)) }}>Earliest vs latest</button>
          </div>
        </section>
      )}
      <section className={panel} aria-label="What changed">
        <h2 className={h2}>What changed</h2>
        <p className="mt-2 text-ink-100">{summary}</p>
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Comparison statistics for {m.label}</caption>
          <thead><tr><th scope="col" className="py-1 pr-4">Measure</th><th scope="col" className="py-1 pr-4">Period A</th><th scope="col" className="py-1 pr-4">Period B</th><th scope="col" className="py-1">B minus A</th></tr></thead>
          <tbody>
            <tr><th scope="row" className="py-1 pr-4 font-normal">Average ({m.units})</th><td className="pr-4">{fmt(comparison.stats.meanA)}</td><td className="pr-4">{fmt(comparison.stats.meanB)}</td><td>{fmt(comparison.stats.meanDiff)}</td></tr>
            <tr><th scope="row" className="py-1 pr-4 font-normal">Trend inside the period (per step)</th><td className="pr-4">{fmt(comparison.stats.trendA, 3)}</td><td className="pr-4">{fmt(comparison.stats.trendB, 3)}</td><td>{comparison.stats.trendA !== null && comparison.stats.trendB !== null ? fmt(comparison.stats.trendB - comparison.stats.trendA, 3) : 'n/a'}</td></tr>
          </tbody>
        </table>
        <div className="mt-6 space-y-6">
          <TimeSeriesChart
            title={`${m.label}: period A and period B, position by position`} summary={summary} labels={positions} rowLabels={rowLabels} step={state.step < comparison.length && cmode !== 'sequential' ? state.step : undefined}
            series={[{ id: 'a', label: 'Period A', units: m.units, values: comparison.a }, { id: 'b', label: 'Period B', units: m.units, values: comparison.b }]}
          />
          <DiffBars title="Difference, period B minus period A" summary={`Average difference ${fmt(comparison.stats.meanDiff)} ${m.units}.`} labels={rowLabels} diff={comparison.diff} units={m.units} />
        </div>
      </section>
      <section className={panel} aria-label="Listen to the comparison">
        <h2 className={h2}>Listen to the change</h2>
        <fieldset className="mt-3">
          <legend className="mb-1 text-sm text-ink-300">How to listen</legend>
          <div className="space-y-1">
            {MODES.map((o) => (
              <label key={o.id} className="flex min-h-11 items-start gap-2 text-sm text-ink-100">
                <input type="radio" name="tt-mode" className="mt-1 h-5 w-5" checked={cmode === o.id} onChange={() => setCmode(o.id)} />
                <span><strong>{o.label}.</strong> <span className="text-ink-300">{o.help}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4"><TransportControls player={player} stepLabels={score.stepLabels} mode={mode} onMode={(x) => { setMode(x); controller.setMode(x) }} /></div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={btn} onClick={dl}>Download this comparison (WAV)</button>
          <p className="text-xs text-ink-300">Sound fingerprint <code>{score.fingerprint}</code></p>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <CaptionPanel headline={score.stepLabels[state.step] ?? ''} lines={[moment]} live={live} onLive={setLive} onDescribe={describeNow} />
        <section className={panel} aria-label="Live sound display"><h2 className={h2}>The sound itself</h2><div className="mt-3"><AudioScope source={player.backend} active={state.status === 'playing'} /></div></section>
      </div>
      <ScienceCard info={info} dataset={dsA} legend={score.legend} />
    </div>
  )
}
