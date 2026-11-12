import { useId } from 'react'
import { extent, linePath, linearScale, niceTicks } from '../core/charts.ts'
import { formatValue } from '../core/describe.ts'

export interface ChartSeries {
  id: string
  label: string
  units: string
  values: (number | null)[]
}

interface Props {
  title: string
  /** One or two sentences saying what the chart shows (read by screen readers). */
  summary: string
  labels: string[]
  /** Row headings for the data table when they differ from the axis labels. */
  rowLabels?: string[]
  series: ChartSeries[]
  /** Index of the current step: drawn as a playhead. */
  step?: number
}

const W = 720
const H = 300
const M = { l: 58, r: 18, t: 16, b: 38 }
const STROKE = ['stroke-signal', 'stroke-ember', 'stroke-ink-300']
const DASH = [undefined, '8 5', '2 5'] // each line also has its own dash pattern, so color is never the only cue

export function TimeSeriesChart({ title, summary, labels, rowLabels, series, step }: Props) {
  const tableId = useId()
  const n = labels.length
  const ext = extent(series.flatMap((s) => s.values))
  if (n === 0 || !ext) return <p className="text-ink-300">There are no values to chart.</p>
  const pad = (ext[1] - ext[0] || 1) * 0.08
  const y = linearScale([ext[0] - pad, ext[1] + pad], [H - M.b, M.t])
  const x = linearScale([0, Math.max(1, n - 1)], [M.l, W - M.r])
  const xs = labels.map((_, i) => i)
  const yTicks = niceTicks(ext[0] - pad, ext[1] + pad, 5)
  const xTicks = Array.from(new Set(Array.from({ length: Math.min(6, n) }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, Math.min(6, n) - 1)))))
  const cur = step !== undefined && step >= 0 && step < n ? step : null

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-medium text-ink-100">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${summary}`} className="h-auto w-full">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-edge" strokeWidth="1" />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-300" fontSize="11">{Number(t.toFixed(2))}</text>
          </g>
        ))}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={H - 14} textAnchor="middle" className="fill-ink-300" fontSize="11">{labels[i]}</text>
        ))}
        {ext[0] < 0 && ext[1] > 0 && <line x1={M.l} x2={W - M.r} y1={y(0)} y2={y(0)} className="stroke-ink-500" strokeWidth="1" strokeDasharray="2 3" />}
        {series.map((s, k) => (
          <path key={s.id} d={linePath(xs, s.values, x, y)} fill="none" className={STROKE[k % 3]} strokeWidth="2.25" strokeDasharray={DASH[k % 3]} strokeLinejoin="round" />
        ))}
        {cur !== null && (
          <g>
            <line x1={x(cur)} x2={x(cur)} y1={M.t} y2={H - M.b} className="stroke-ink-100" strokeWidth="1.5" />
            {series.map((s, k) => {
              const v = s.values[cur]
              return v === null ? null : <circle key={s.id} cx={x(cur)} cy={y(v)} r="5" className={`${STROKE[k % 3].replace('stroke', 'fill')} stroke-space-950`} strokeWidth="2" />
            })}
          </g>
        )}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-300">
        {series.map((s, k) => (
          <li key={s.id} className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden="true"><line x1="0" x2="28" y1="4" y2="4" className={STROKE[k % 3]} strokeWidth="2.5" strokeDasharray={DASH[k % 3]} /></svg>
            {s.label} ({s.units})
          </li>
        ))}
      </ul>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-300 underline">Show the numbers as a table</summary>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a long scrollable table must be reachable by keyboard (WCAG 2.1.1) */}
        <div className="mt-2 max-h-72 overflow-auto" role="region" aria-label={`${title}: data table`} tabIndex={0}>
          <table id={tableId} className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 bg-space-900 px-2 py-1">Step</th>
                {series.map((s) => <th key={s.id} scope="col" className="sticky top-0 bg-space-900 px-2 py-1">{s.label} ({s.units})</th>)}
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={`${l}-${i}`} className={i === cur ? 'bg-space-700' : undefined}>
                  <th scope="row" className="px-2 py-1 font-normal">{rowLabels?.[i] ?? l}</th>
                  {series.map((s) => <td key={s.id} className="px-2 py-1">{s.values[i] === null ? 'no data' : formatValue(s.values[i] as number, '').trim()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
