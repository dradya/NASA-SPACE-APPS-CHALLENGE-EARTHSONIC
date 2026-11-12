import { clamp } from '../core/series.ts'
import { plainValue, formatValue } from '../core/describe.ts'
import type { Dataset } from '../core/types.ts'
import type { PhenomenonInfo } from '../registry/phenomena.ts'

interface Props {
  info: PhenomenonInfo
  dataset: Dataset
  /** Dataset step currently sounding (global index). */
  step: number
  from: number
  to: number
}

/** A picture drawn from the same numbers as the sound. Meaning is carried by size and position and by a written value, never by color alone. */
export function PhenomenonVisual({ info, dataset, step, from, to }: Props) {
  const label = dataset.steps[step]?.label ?? ''
  const m = dataset.measures[dataset.primary]
  const v = m.values[step]
  const text = v === null || v === undefined ? `${label}: no data` : `${label}: ${m.units.startsWith('°C vs') ? plainValue(m.units, v) : formatValue(v, m.units)}`
  const aria = `${info.visual.description} Currently: ${text}.`

  if (info.visual.kind === 'stripes') {
    const idx = Array.from({ length: to - from }, (_, k) => from + k)
    const W = 720
    const H = 200
    const bw = W / idx.length
    return (
      <svg viewBox={`0 0 ${W} ${H + 28}`} role="img" aria-label={aria} className="h-auto w-full">
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} className="stroke-ink-500" strokeWidth="1" />
        {idx.map((g, k) => {
          const val = m.values[g]
          if (val === null) return null
          const h = (clamp(Math.abs(val) / 1.6, 0, 1) * H) / 2
          return <rect key={g} x={k * bw} width={Math.max(1, bw - 0.6)} y={val >= 0 ? H / 2 - h : H / 2} height={Math.max(1, h)} className={val >= 0 ? 'fill-ember' : 'fill-signal'} stroke={g === step ? 'var(--color-ink-100)' : 'none'} strokeWidth={g === step ? 3 : 0} />
        })}
        <text x="0" y={H + 20} className="fill-ink-100" fontSize="14">{text}</text>
      </svg>
    )
  }
  if (info.visual.kind === 'gauge') {
    const t = v === null ? 0 : clamp((v + 10) / 150, 0, 1)
    return (
      <svg viewBox="0 0 260 260" role="img" aria-label={aria} className="mx-auto h-auto w-full max-w-xs">
        <rect x="90" y="20" width="60" height="200" rx="8" className="fill-space-950 stroke-ink-500" strokeWidth="2" />
        <rect x="92" y={20 + 196 * (1 - t) + 2} width="56" height={196 * t} rx="6" className="fill-signal" />
        {[0, 50, 100, 150].map((mm) => <g key={mm}><line x1="150" x2="162" y1={20 + 196 * (1 - (mm + 10) / 150) + 2} y2={20 + 196 * (1 - (mm + 10) / 150) + 2} className="stroke-ink-300" /><text x="168" y={20 + 196 * (1 - (mm + 10) / 150) + 6} className="fill-ink-300" fontSize="11">{mm} mm</text></g>)}
        <text x="130" y="244" textAnchor="middle" className="fill-ink-100" fontSize="13">{text}</text>
      </svg>
    )
  }
  if (info.visual.kind === 'ice') {
    const sept = dataset.measures.september.values[step]
    const march = dataset.measures.march.values[step]
    const r = (e: number | null) => (e === null ? 0 : 110 * Math.sqrt(e / 17))
    return (
      <svg viewBox="0 0 260 270" role="img" aria-label={aria} className="mx-auto h-auto w-full max-w-xs">
        <circle cx="130" cy="125" r={r(march)} fill="none" className="stroke-ink-300" strokeWidth="2" strokeDasharray="6 5" />
        <circle cx="130" cy="125" r={r(sept)} className="fill-ink-100" />
        <text x="130" y="258" textAnchor="middle" className="fill-ink-100" fontSize="12">{label}: Sept {sept === null ? 'no data' : formatValue(sept, 'M km²')}, March {march === null ? 'no data' : formatValue(march, 'M km²')}</text>
      </svg>
    )
  }
  const t = v === null ? 0 : clamp(v, 0, 1)
  return (
    <svg viewBox="0 0 260 260" role="img" aria-label={aria} className="mx-auto h-auto w-full max-w-xs">
      <rect x="100" y="20" width="60" height="200" rx="8" className="fill-space-950 stroke-ink-500" strokeWidth="2" />
      <rect x="102" y={20 + 196 * (1 - t) + 2} width="56" height={196 * t} rx="6" fill="#7bd88f" />
      {[0, 0.5, 1].map((n) => <g key={n}><line x1="160" x2="172" y1={20 + 196 * (1 - n) + 2} y2={20 + 196 * (1 - n) + 2} className="stroke-ink-300" /><text x="178" y={20 + 196 * (1 - n) + 6} className="fill-ink-300" fontSize="11">{n}</text></g>)}
      <text x="130" y="244" textAnchor="middle" className="fill-ink-100" fontSize="13">{v === null ? `${label}: no data` : `${label}: NDVI ${v.toFixed(2)}`}</text>
    </svg>
  )
}
