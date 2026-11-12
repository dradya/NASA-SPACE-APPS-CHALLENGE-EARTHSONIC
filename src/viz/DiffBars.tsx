import { extent, linearScale } from '../core/charts.ts'

interface Props {
  title: string
  summary: string
  labels: string[]
  diff: (number | null)[]
  units: string
}

const W = 720
const H = 200

/** Bars above the line: period B is higher than period A at that position; below: lower. Direction is also given by position, not color alone. */
export function DiffBars({ title, summary, labels, diff, units }: Props) {
  const ext = extent([...diff, 0])
  if (!ext || diff.length === 0) return null
  const span = Math.max(Math.abs(ext[0]), Math.abs(ext[1])) || 1
  const y = linearScale([-span, span], [H - 24, 14])
  const bw = (W - 80) / diff.length
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-medium text-ink-100">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${summary}`} className="h-auto w-full">
        <line x1="60" x2={W - 10} y1={y(0)} y2={y(0)} className="stroke-ink-500" strokeWidth="1" />
        <text x="54" y={y(span) + 4} textAnchor="end" className="fill-ink-300" fontSize="11">+{Number(span.toFixed(2))}</text>
        <text x="54" y={y(-span) + 4} textAnchor="end" className="fill-ink-300" fontSize="11">−{Number(span.toFixed(2))}</text>
        <text x="54" y={y(0) + 4} textAnchor="end" className="fill-ink-300" fontSize="11">0</text>
        {diff.map((d, i) => {
          if (d === null) return <line key={i} x1={64 + i * bw + bw / 2} x2={64 + i * bw + bw / 2} y1={y(0) - 3} y2={y(0) + 3} className="stroke-ink-500" strokeWidth="1" />
          const top = Math.min(y(0), y(d))
          return <rect key={i} x={64 + i * bw + 1} width={Math.max(1, bw - 2)} y={top} height={Math.max(1, Math.abs(y(d) - y(0)))} className={d >= 0 ? 'fill-ember' : 'fill-signal'} />
        })}
        <text x="64" y={H - 4} className="fill-ink-300" fontSize="11">{labels[0]}</text>
        <text x={W - 10} y={H - 4} textAnchor="end" className="fill-ink-300" fontSize="11">{labels[labels.length - 1]}</text>
      </svg>
      <p className="mt-1 text-xs text-ink-300">Orange bars (above the line): B higher than A. Blue bars (below): B lower. Unit: {units}.</p>
    </figure>
  )
}
