import { PHENOMENA, PHENOMENON_IDS } from '../registry/phenomena.ts'
import type { PhenomenonId } from '../core/types.ts'

/** A native radio group: arrow keys move between options and screen readers announce "n of 4". */
export function PhenomenonPicker({ value, onChange, name }: { value: PhenomenonId; onChange: (id: PhenomenonId) => void; name: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-ink-300">Phenomenon</legend>
      <div className="flex flex-wrap gap-3">
        {PHENOMENON_IDS.map((id) => (
          <label key={id} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm ${value === id ? 'border-signal bg-space-800 text-ink-100' : 'border-ink-500 text-ink-300 hover:text-ink-100'}`}>
            <input type="radio" name={name} className="h-4 w-4" checked={value === id} onChange={() => onChange(id)} />
            {PHENOMENA[id].short}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
