import { useCallback, useEffect, useState } from 'react'
import { buildDemoDataset } from '../core/datasets.ts'
import type { DataLoadError, Dataset, PhenomenonId } from '../core/types.ts'
import { asLoadError, datasetFromFile, loadPhenomenon } from '../data/loaders'
import type { Site } from '../registry/phenomena.ts'

export interface DatasetState {
  status: 'loading' | 'ready' | 'error'
  dataset: Dataset | null
  error: DataLoadError | null
  reload: () => void
  useDemo: () => void
  loadFile: (file: File) => Promise<void>
}

interface Settled {
  key: string
  dataset: Dataset | null
  error: DataLoadError | null
}

/**
 * Loads a phenomenon from NASA (snapshot, then live), with loading / ready / error states.
 * The user can also choose a NASA file or explicitly switch to clearly labelled DEMO data.
 * Results belong to a key, so a stale answer for a previous choice is never shown (and no state is set synchronously in an effect).
 */
export function useDataset(id: PhenomenonId, site: Site | null, year: number | null): DatasetState {
  const [nonce, setNonce] = useState(0)
  const key = `${id}|${site?.id ?? ''}|${year ?? ''}|${nonce}`
  const [settled, setSettled] = useState<Settled | null>(null)
  const [override, setOverride] = useState<Settled | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPhenomenon(id, { site: site ?? undefined, year: year ?? undefined, refresh: nonce > 0 })
      .then((dataset) => { if (!cancelled) setSettled({ key, dataset, error: null }) })
      .catch((e: unknown) => { if (!cancelled) setSettled({ key, dataset: null, error: asLoadError(e) }) })
    return () => { cancelled = true }
  }, [id, site, year, nonce, key])

  const baseKey = `${id}|${site?.id ?? ''}|${year ?? ''}|`
  const active = override && override.key.startsWith(baseKey) ? override : settled && settled.key === key ? settled : null

  const reload = useCallback(() => { setOverride(null); setNonce((n) => n + 1) }, [])
  const useDemo = useCallback(() => setOverride({ key: baseKey, dataset: buildDemoDataset(id), error: null }), [baseKey, id])
  const loadFile = useCallback(async (file: File) => {
    try {
      setOverride({ key: baseKey, dataset: await datasetFromFile(id, file), error: null })
    } catch (e) {
      setOverride({ key: baseKey, dataset: null, error: asLoadError(e) })
    }
  }, [baseKey, id])

  return {
    status: active === null ? 'loading' : active.dataset ? 'ready' : 'error',
    dataset: active?.dataset ?? null, error: active?.error ?? null, reload, useDemo, loadFile,
  }
}
