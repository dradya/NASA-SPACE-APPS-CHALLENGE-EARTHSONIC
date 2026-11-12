import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { btn, btnPrimary, panel } from '../components/ui'
import { PHENOMENA, PHENOMENON_IDS } from '../registry/phenomena.ts'

export function ExplorerPage() {
  return (
    <>
      <PageHeader eyebrow="Step 1" title="Earth Explorer" lead="Choose a phenomenon. Each one comes from a different NASA dataset, with its own units, resolution and sound." />
      <ul className="mt-10 grid gap-6 lg:grid-cols-2">
        {PHENOMENON_IDS.map((id) => {
          const p = PHENOMENA[id]
          return (
            <li key={id} className={panel}>
              <h2 className="font-display text-3xl font-light text-ink-100">{p.title}</h2>
              <p className="mt-1 text-ink-300">{p.tagline}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-ink-300">What you will hear</dt><dd className="text-ink-100">{p.hearing}</dd></div>
                <div><dt className="text-ink-300">Dataset</dt><dd className="text-ink-100">{p.datasetName}</dd></div>
                <div><dt className="text-ink-300">NASA source</dt><dd className="text-ink-100">{p.nasaSource}</dd></div>
                <div><dt className="text-ink-300">Units</dt><dd className="text-ink-100">{p.units}</dd></div>
                <div><dt className="text-ink-300">Coverage</dt><dd className="text-ink-100">{p.coverage}</dd></div>
                <div><dt className="text-ink-300">Resolution</dt><dd className="text-ink-100">{p.temporalResolution}. {p.spatialResolution}.</dd></div>
                <div><dt className="text-ink-300">Access</dt><dd className="text-ink-100">{p.access === 'public' ? 'Public: loads without any login.' : 'Needs a free NASA Earthdata Login to download; you can choose the file you downloaded.'}</dd></div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/studio?p=${id}`} className={btnPrimary}>Open in the Studio<span className="sr-only">: {p.title}</span></Link>
                <Link to={`/time-travel?p=${id}`} className={btn}>Time Travel<span className="sr-only">: {p.title}</span></Link>
                {p.nasaVisualization && <a href={p.nasaVisualization.url} target="_blank" rel="noreferrer" className={btn}>NASA&rsquo;s visualization<span className="sr-only"> of {p.title} (opens in a new tab)</span></a>}
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
