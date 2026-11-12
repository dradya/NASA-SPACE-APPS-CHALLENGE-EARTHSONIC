// Generates docs/SONIFICATION_MAPPINGS.md from the real mapping specs and registry, so the documentation cannot drift
// from what the app does. Run `npm run docs` after changing a mapping; tests/core/docs.test.ts fails if the file is stale.
import { MAPPINGS, SAFE_BAND } from '../core/mappings.ts'
import { PHENOMENA, PHENOMENON_IDS } from './phenomena.ts'

export function renderMappingDocs(): string {
  const out: string[] = []
  out.push('# EARTHSONIC — Sonification mappings', '')
  out.push('> This file is GENERATED from `src/core/mappings.ts` and `src/registry/phenomena.ts` by `npm run docs`. Do not edit it by hand.', '')
  out.push('## Principles', '')
  out.push('1. **Pitch for magnitude.** The main measured quantity maps to pitch, linear in semitones: equal steps in the data are equal musical intervals.')
  out.push('2. **Fixed reference scales.** Each pitch domain is fixed for the physical quantity, not taken from the selected dates, so two periods can be compared by ear. Values outside a domain are held at its end and the caption says so.')
  out.push('3. **Reference tone.** Where a zero point exists (a baseline or a starting level), a quiet steady tone marks it.')
  out.push('4. **Rate of change is rhythm.** The speed of change drives how many short pulses play per step. It does not change playback speed, which is a separate user control.')
  out.push('5. **Missing is silent.** A missing value makes that voice silent and is announced in text. Nothing is interpolated.')
  out.push(`6. **Safe by construction.** Every pitch is held inside ${SAFE_BAND[0]}–${SAFE_BAND[1]} Hz; the output passes through a limiter.`)
  out.push('7. **Determinism.** The same data and settings give the same notes (same fingerprint), and the same downloadable audio file. No random numbers are used anywhere in the data-to-sound path.')
  out.push('8. **Two listening modes.** Scientific: continuous pitch. Musical: each pitch snaps to the nearest note of the C major pentatonic scale (C D E G A). Same data, same mapping, same legend.')
  out.push('9. **Intensity** (0–1, default 0.5) scales loudness and brightness contrast only. It never changes pitch.', '')
  for (const id of PHENOMENON_IDS) {
    const info = PHENOMENA[id]
    const spec = MAPPINGS[id]
    out.push(`## ${info.title}`, '')
    out.push(`**What you hear:** ${info.hearing}`, '')
    out.push(`**Data:** ${info.datasetName}. Units: ${info.units}. One step is one ${info.stepNoun}.`, '')
    out.push('| Voice | Stands for | How it sounds |', '|---|---|---|')
    for (const v of spec.voices) {
      const shape = v.fixedFreqHz !== undefined && !v.pitch ? `fixed tone ${v.fixedFreqHz.toFixed(1)} Hz, ${v.waveform}` : `${v.waveform}`
      out.push(`| ${v.label} (${shape}, pan ${v.pan}) | ${v.role} | ${v.explain.join(' ')} |`)
    }
    out.push('')
    if (spec.accent) out.push(`**Accent:** ${spec.accent.explain}`, '')
    out.push(`**Time Travel difference voice:** ${spec.diff.explain}`, '')
    out.push('**Limitations:**', '', ...info.limitations.map((l) => `- ${l}`), '')
  }
  return out.join('\n') + '\n'
}
