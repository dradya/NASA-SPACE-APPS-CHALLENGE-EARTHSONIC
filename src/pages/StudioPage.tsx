import { useSearchParams } from 'react-router'
import { DataStatus } from '../components/DataStatus'
import { PageHeader } from '../components/PageHeader'
import { PhenomenonPicker } from '../components/PhenomenonPicker'
import { ScienceCard } from '../components/ScienceCard'
import { field } from '../components/ui'
import { MAPPINGS } from '../core/mappings.ts'
import { PHENOMENA, isPhenomenonId } from '../registry/phenomena.ts'
import { useDataset } from '../state/useDataset'
import { StudioView } from './StudioView'

const MAX_YEAR = new Date().getFullYear() - 1
export const YEARS = Array.from({ length: MAX_YEAR - 2000 }, (_, i) => 2001 + i)

export function StudioPage() {
  const [params, setParams] = useSearchParams()
  const p = params.get('p')
  const id = isPhenomenonId(p) ? p : 'global-temperature'
  const info = PHENOMENA[id]
  const site = info.sites?.find((s) => s.id === params.get('site')) ?? info.sites?.[0] ?? null
  const year = info.sites ? (YEARS.includes(Number(params.get('year'))) ? Number(params.get('year')) : Math.min(2023, MAX_YEAR)) : null
  const state = useDataset(id, site, year)
  const set = (patch: Record<string, string>) => setParams({ p: id, ...(site ? { site: site.id } : {}), ...(year ? { year: String(year) } : {}), ...patch })

  return (
    <>
      <PageHeader eyebrow="Step 2" title="Sonification Studio" lead="Press play and hear the data. The picture, the numbers and the sound always show the same moment." />
      <div className="mt-8 space-y-4">
        <PhenomenonPicker name="studio-phenomenon" value={id} onChange={(next) => setParams({ p: next })} />
        {info.sites && site && year && (
          <div className="flex flex-wrap gap-4">
            <label className="text-sm text-ink-300">Place
              <select className={`${field} ml-2`} value={site.id} onChange={(e) => set({ site: e.target.value })}>{info.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
            <label className="text-sm text-ink-300">Year
              <select className={`${field} ml-2`} value={year} onChange={(e) => set({ year: e.target.value })}>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            </label>
          </div>
        )}
        <DataStatus info={info} state={state} />
      </div>
      {state.dataset ? (
        <StudioView key={`${id}-${site?.id}-${year}-${state.dataset.provenance.origin}-${state.dataset.steps.length}-${state.dataset.steps[0]?.label}`} info={info} dataset={state.dataset} site={site} />
      ) : (
        <div className="mt-8">
          <ScienceCard info={info} dataset={null} legend={MAPPINGS[id].voices.map((v) => ({ voice: v.label, text: `${v.role} ${v.explain.join(' ')}` }))} />
        </div>
      )}
    </>
  )
}
