import type { ReactNode } from 'react'
import type { Dataset, Score } from '../core/types.ts'
import type { PhenomenonInfo } from '../registry/phenomena.ts'
import { h2, panel } from './ui'

interface Props {
  info: PhenomenonInfo
  dataset: Dataset | null
  /** Legend of the score currently loaded, so the card describes exactly what is playing. */
  legend: Score['legend']
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-ink-300">{term}</dt>
      <dd className="text-sm text-ink-100">{children}</dd>
    </div>
  )
}

/** Scientific transparency: where the data come from, what the units mean, and what the sounds represent. Always visible next to the player. */
export function ScienceCard({ info, dataset, legend }: Props) {
  const first = dataset?.steps[0]?.label
  const last = dataset?.steps[dataset.steps.length - 1]?.label
  return (
    <section aria-labelledby={`science-${info.id}`} className={panel}>
      <h2 id={`science-${info.id}`} className={h2}>About this data: {info.title}</h2>
      <dl className="mt-3 divide-y divide-edge">
        <Row term="Dataset">{info.datasetName}</Row>
        <Row term="NASA source">{info.nasaSource} · <a className="underline" href={info.sourceUrl} target="_blank" rel="noreferrer">source<span className="sr-only"> (opens in a new tab)</span></a>{info.doi ? <> · DOI {info.doi}</> : null}</Row>
        <Row term="Units">{info.units}</Row>
        <Row term="Date range">{dataset && first ? `${first} to ${last} (${dataset.steps.length} steps; one step is ${dataset.stepUnit}). Expected coverage: ${info.coverage}.` : info.coverage}</Row>
        <Row term="Time resolution">{info.temporalResolution}</Row>
        <Row term="Spatial resolution">{info.spatialResolution}</Row>
        <Row term="Access">{info.accessNote}</Row>
        <Row term="Picture, numbers and sound">{info.alignmentNote}</Row>
        {dataset && <Row term="This copy of the data">{dataset.provenance.sourceName}; {dataset.provenance.origin === 'demo' ? 'synthetic demo pattern' : `origin: ${dataset.provenance.origin}`}{dataset.provenance.fileName ? `; file ${dataset.provenance.fileName}` : ''}{dataset.provenance.retrievedUtc ? `; retrieved ${dataset.provenance.retrievedUtc}` : ''}{dataset.provenance.sha256 ? `; SHA-256 ${dataset.provenance.sha256.slice(0, 12)}…` : ''}</Row>}
      </dl>
      <details className="mt-4" open>
        <summary className="cursor-pointer font-medium text-ink-100">The science in plain words</summary>
        <div className="mt-2 space-y-2 text-sm text-ink-300">{info.explanation.map((p) => <p key={p}>{p}</p>)}</div>
      </details>
      <details className="mt-3" open>
        <summary className="cursor-pointer font-medium text-ink-100">What each sound means</summary>
        <ul className="mt-2 space-y-2 text-sm text-ink-300">
          {legend.map((l) => <li key={l.voice}><strong className="text-ink-100">{l.voice}.</strong> {l.text}</li>)}
        </ul>
      </details>
      <details className="mt-3">
        <summary className="cursor-pointer font-medium text-ink-100">Limitations and cautions</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-300">
          {info.limitations.map((l) => <li key={l}>{l}</li>)}
          {dataset?.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </details>
      <details className="mt-3">
        <summary className="cursor-pointer font-medium text-ink-100">Citation and credit</summary>
        <p className="mt-2 text-sm text-ink-300">{info.citation}</p>
        <p className="mt-1 text-sm text-ink-300">Credit: {info.credit}.{info.nasaVisualization ? <> NASA&rsquo;s own visualization: <a className="underline" href={info.nasaVisualization.url} target="_blank" rel="noreferrer">{info.nasaVisualization.label}<span className="sr-only"> (opens in a new tab)</span></a>.</> : null}</p>
      </details>
    </section>
  )
}
