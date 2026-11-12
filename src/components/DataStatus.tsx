import { useId, type ChangeEvent } from 'react'
import type { DatasetState } from '../state/useDataset'
import type { PhenomenonInfo } from '../registry/phenomena.ts'
import type { Dataset } from '../core/types.ts'
import { btn, panel } from './ui'

/** Loading, error and empty states, plus the clear REAL / DEMO label that must always be visible. */
export function DataStatus({ info, state }: { info: PhenomenonInfo; state: DatasetState }) {
  const fileId = useId()
  const canLoadFile = info.id !== 'vegetation'

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) void state.loadFile(f)
    e.target.value = ''
  }

  if (state.status === 'loading') {
    return (
      <div className={panel} role="status">
        <p className="text-ink-100">Loading {info.title.toLowerCase()} data from NASA…</p>
        <p className="mt-1 text-sm text-ink-300">First the bundled snapshot is tried, then NASA directly. This usually takes a few seconds.</p>
      </div>
    )
  }
  if (state.status === 'error' && state.error) {
    return (
      <div className={`${panel} border-ember`} role="alert">
        <p className="font-medium text-ember">The {info.title.toLowerCase()} data could not be loaded</p>
        <p className="mt-2 text-ink-100">{state.error.message}</p>
        {info.getFile && state.error.needsFile && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-300">
            {info.getFile.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {state.error.retryable && <button type="button" className={btn} onClick={state.reload}>Try again</button>}
          {canLoadFile && (
            <>
              <label htmlFor={fileId} className={`${btn} cursor-pointer`}>Choose a NASA data file</label>
              <input id={fileId} type="file" className="sr-only" onChange={onFile} />
            </>
          )}
          <button type="button" className={btn} onClick={state.useDemo}>Try the controls with demo data</button>
        </div>
        <p className="mt-3 text-xs text-ink-500">Demo data is a synthetic pattern and is always labelled as such. It is never presented as NASA data.</p>
      </div>
    )
  }
  const ds = state.dataset as Dataset
  return ds.status === 'demo' ? (
    <div className={`${panel} border-ember`} role="note">
      <p className="font-semibold uppercase tracking-wide text-ember">Demo data — not NASA measurements</p>
      <p className="mt-1 text-sm text-ink-100">{ds.notes[0]}</p>
      <button type="button" className={`${btn} mt-3`} onClick={state.reload}>Load real NASA data instead</button>
    </div>
  ) : (
    <p className="text-sm text-ink-300" role="note">
      <span className="font-semibold text-signal">Real NASA data</span> · {ds.provenance.sourceName} · {ds.provenance.origin === 'file' ? `file you chose (${ds.provenance.fileName})` : ds.provenance.origin === 'snapshot' ? 'bundled snapshot' : 'fetched live from NASA'}
      {ds.provenance.retrievedUtc ? ` · retrieved ${ds.provenance.retrievedUtc.slice(0, 10)}` : ''}
      {canLoadFile && (
        <>
          {' · '}
          <label htmlFor={fileId} className="cursor-pointer underline">use a different file</label>
          <input id={fileId} type="file" className="sr-only" onChange={onFile} />
        </>
      )}
    </p>
  )
}
