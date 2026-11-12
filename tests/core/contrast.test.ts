import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contrastRatio, parseHexColor, relativeLuminance } from '../../src/core/contrast.ts'

test('parseHexColor handles #rgb and #rrggbb and rejects everything else', () => {
  assert.deepEqual(parseHexColor('#fff'), [255, 255, 255])
  assert.deepEqual(parseHexColor('#03060d'), [3, 6, 13])
  assert.deepEqual(parseHexColor('  #ABCDEF '), [171, 205, 239])
  assert.throws(() => parseHexColor('red'), TypeError)
  assert.throws(() => parseHexColor('#12345'), TypeError)
})

test('relative luminance of black and white', () => {
  assert.equal(relativeLuminance([0, 0, 0]), 0)
  assert.ok(Math.abs(relativeLuminance([255, 255, 255]) - 1) < 1e-12)
})

test('contrastRatio reproduces known WCAG values', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 1e-9)
  assert.ok(Math.abs(contrastRatio('#ffffff', '#ffffff') - 1) < 1e-9)
  // #767676 on white is the classic "just passes AA" gray (4.54:1).
  const gray = contrastRatio('#767676', '#ffffff')
  assert.ok(gray > 4.5 && gray < 4.6, `got ${gray}`)
  // Order of the two colors does not matter.
  assert.equal(contrastRatio('#123456', '#fedcba'), contrastRatio('#fedcba', '#123456'))
})
