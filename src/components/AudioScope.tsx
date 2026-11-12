import { useEffect, useRef } from 'react'
import type { AnalysisSource } from '../audio/audioMath.ts'

/** Live waveform (top) and frequency spectrum (bottom) of the actual output. Purely visual: the caption carries the same information in words. */
export function AudioScope({ source, active }: { source: AnalysisSource; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const css = getComputedStyle(document.documentElement)
    const signal = css.getPropertyValue('--color-signal').trim() || '#6fd8f0'
    const ember = css.getPropertyValue('--color-ember').trim() || '#ffb36b'
    const edge = css.getPropertyValue('--color-edge').trim() || '#2a3d63'
    let raf = 0
    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = edge
      ctx.beginPath(); ctx.moveTo(0, h / 4); ctx.lineTo(w, h / 4); ctx.stroke()
      const wave = active ? source.getWaveform() : null
      ctx.strokeStyle = signal
      ctx.lineWidth = 2
      ctx.beginPath()
      if (wave) wave.forEach((v, i) => { const x = (i / (wave.length - 1)) * w; const y = h / 4 - v * (h / 4 - 4); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y) })
      else { ctx.moveTo(0, h / 4); ctx.lineTo(w, h / 4) }
      ctx.stroke()
      const spec = active ? source.getSpectrum() : null
      ctx.fillStyle = ember
      if (spec) {
        const bins = Math.min(spec.length, 160)
        const bw = w / bins
        for (let i = 0; i < bins; i++) {
          const mag = Math.max(0, Math.min(1, (spec[i] + 100) / 100)) // decibels -100..0 -> 0..1
          ctx.fillRect(i * bw, h - mag * (h / 2 - 6), Math.max(1, bw - 1), mag * (h / 2 - 6))
        }
      }
      if (active) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [source, active])

  return <canvas ref={ref} width={640} height={160} role="img" aria-label="Live waveform and frequency spectrum of the sound. Decorative: the caption above says the same in words." className="h-auto w-full rounded-lg border border-edge bg-space-950" />
}
