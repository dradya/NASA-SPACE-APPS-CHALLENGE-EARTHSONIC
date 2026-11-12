// Reads the REAL stylesheet (src/styles/index.css) and checks WCAG contrast of every text/background
// pair, in the default theme and in the high-contrast theme.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { contrastRatio } from '../../src/core/contrast.ts'

const css = readFileSync(new URL('../../src/styles/index.css', import.meta.url), 'utf8')

/** Text between the braces that follow `header`, supporting nested braces. */
function extractBlock(source: string, header: string): string {
  const start = source.indexOf(header)
  assert.ok(start >= 0, `block not found: ${header}`)
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') depth--
    if (depth === 0) return source.slice(open + 1, i)
  }
  throw new Error(`unterminated block: ${header}`)
}

function colors(block: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    result[match[1]] = match[2]
  }
  return result
}

const normal = colors(extractBlock(css, '@theme'))
const high = { ...normal, ...colors(extractBlock(css, ":root[data-contrast='high']")) }

const TEXT = ['ink-100', 'ink-300', 'ink-500', 'signal', 'ember']
const SURFACES = ['space-950', 'space-900', 'space-800']

test('the stylesheet defines every token the tests and components rely on', () => {
  for (const name of [...TEXT, ...SURFACES, 'space-700', 'focus', 'edge']) {
    assert.ok(normal[name], `missing --color-${name} in @theme`)
  }
})

test('default theme: all text colors reach WCAG AA (4.5:1) on every surface', () => {
  for (const text of TEXT) {
    for (const surface of SURFACES) {
      const ratio = contrastRatio(normal[text], normal[surface])
      assert.ok(ratio >= 4.5, `${text} on ${surface}: ${ratio.toFixed(2)}:1`)
    }
  }
})

test('default theme: the focus ring reaches 3:1 against every surface (WCAG 1.4.11)', () => {
  for (const surface of SURFACES) {
    const ratio = contrastRatio(normal.focus, normal[surface])
    assert.ok(ratio >= 3, `focus on ${surface}: ${ratio.toFixed(2)}:1`)
  }
})

test('high-contrast theme: all text colors reach WCAG AAA (7:1) on every surface', () => {
  for (const text of TEXT) {
    for (const surface of SURFACES) {
      const ratio = contrastRatio(high[text], high[surface])
      assert.ok(ratio >= 7, `${text} on ${surface}: ${ratio.toFixed(2)}:1`)
    }
  }
})

test('high-contrast theme: focus ring and panel edges are clearly visible', () => {
  for (const surface of SURFACES) {
    assert.ok(contrastRatio(high.focus, high[surface]) >= 7, `focus on ${surface}`)
    assert.ok(contrastRatio(high.edge, high[surface]) >= 4.5, `edge on ${surface}`)
  }
})
