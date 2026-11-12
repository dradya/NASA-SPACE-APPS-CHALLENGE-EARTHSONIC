import { useSearchParams } from 'react-router'
import { DataStatus } from '../components/DataStatus'
import { PageHeader } from '../components/PageHeader'
import { PhenomenonPicker } from '../components/PhenomenonPicker'
import { ScienceCard } from '../components/ScienceCard'
import { field } from '../components/ui'
import { MAPPINGS } from '../core/mappings.ts'
import { PHENOMENA, isPhenomenonId } from '../registry/phenomena.ts'
import { useDataset } from '../state/useDataset'
import { TimeTravelView } from './TimeTravelView'
import { YEARS } from './StudioPage'

export function TimeTravelPage() {
  const [params, setParams] = useSearchParams()
  const p = params.get('p')
  const id = isPhenomenonId(p) ? p : 'global-temperature'
  const info = PHENOMENA[id]
  const site = info.sites?.find((s) => s.id === params.get('site')) ?? info.sites?.[0] ?? null
  const num = (k: string, d: number) => (YEARS.includes(Number(params.get(k))) ? Number(params.get(k)) : d)
  const yearA = info.sites ? num('a', 2003) : null
  const yearB = info.sites ? num('b', Math.min(2023, YEARS[YEARS.length - 1])) : null
  const a = useDataset(id, site, yearA)
  const b = useDataset(id, site, yearB)
  const set = (patch: Record<string, string>) => setParams({ p: id, ...(site ? { site: site.id } : {}), ...(yearA ? { a: String(yearA) } : {}), ...(yearB ? { b: String(yearB) } : {}), ...patch })
  const dsA = a.dataset
  const dsB = info.sites ? b.dataset : a.dataset

  return (
    <>
      <PageHeader eyebrow="Step 3" title="Time Travel Through Sound" lead="Pick two moments in the record and hear how the Earth changed between them." />
      <div className="mt-8 space-y-4">
        <PhenomenonPicker name="tt-phenomenon" value={id} onChange={(next) => setParams({ p: next })} />
        {info.sites && site && yearA && yearB && (
          <div className="flex flex-wrap gap-4">
            <label className="text-sm text-ink-300">Place
              <select className={`${field} ml-2`} value={site.id} onChange={(e) => set({ site: e.target.value })}>{info.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
            <label className="text-sm text-ink-300">Year A
              <select className={`${field} ml-2`} value={yearA} onChange={(e) => set({ a: e.target.value })}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            </label>
            <label className="text-sm text-ink-300">Year B
              <select className={`${field} ml-2`} value={yearB} onChange={(e) => set({ b: e.target.value })}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            </label>
          </div>
        )}
        <DataStatus info={info} state={a} />
        {info.sites && a.status === 'ready' && b.status !== 'ready' && <DataStatus info={info} state={b} />}
      </div>
      {dsA && dsB ? (
        <TimeTravelView key={`${id}-${site?.id}-${yearA}-${yearB}-${dsA.provenance.origin}-${dsA.steps.length}`} info={info} dsA={dsA} dsB={dsB} />
      ) : (
        <div className="mt-8"><ScienceCard info={info} dataset={null} legend={MAPPINGS[id].voices.map((v) => ({ voice: v.label, text: `${v.role} ${v.explain.join(' ')}` }))} /></div>
      )}
    </>
  )
}
