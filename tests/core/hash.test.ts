import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalJson, fnv1a32Hex, settingsHash, utf8Bytes } from '../../src/core/hash.ts'

test('fnv1a32Hex matches the published FNV-1a test vectors', () => {
  assert.equal(fnv1a32Hex(''), '811c9dc5')
  assert.equal(fnv1a32Hex('a'), 'e40c292c')
  assert.equal(fnv1a32Hex('foobar'), 'bf9cf968')
})

test('utf8Bytes encodes 1, 2, 3 and 4 byte characters like UTF-8', () => {
  assert.deepEqual(utf8Bytes('A'), [0x41])
  assert.deepEqual(utf8Bytes('é'), [0xc3, 0xa9])
  assert.deepEqual(utf8Bytes('€'), [0xe2, 0x82, 0xac])
  assert.deepEqual(utf8Bytes('🌍'), [0xf0, 0x9f, 0x8c, 0x8d])
})

test('canonicalJson sorts keys at every depth and has no whitespace', () => {
  const a = { b: 1, a: { d: [3, 2, 1], c: 'x' } }
  const b = { a: { c: 'x', d: [3, 2, 1] }, b: 1 }
  assert.equal(canonicalJson(a), '{"a":{"c":"x","d":[3,2,1]},"b":1}')
  assert.equal(canonicalJson(a), canonicalJson(b))
})

test('canonicalJson keeps array order and omits undefined object properties', () => {
  assert.equal(canonicalJson([2, 1]), '[2,1]')
  assert.equal(canonicalJson({ a: 1, b: undefined }), '{"a":1}')
  assert.equal(canonicalJson([undefined]), '[null]')
  assert.equal(canonicalJson(null), 'null')
})

test('canonicalJson refuses values that would hide data problems', () => {
  assert.throws(() => canonicalJson(NaN), TypeError)
  assert.throws(() => canonicalJson(Infinity), TypeError)
  assert.throws(() => canonicalJson({ x: () => 1 }), TypeError)
  assert.throws(() => canonicalJson(10n), TypeError)
})

test('settingsHash ignores key order and detects any change', () => {
  const base = { mode: 'scientific', speed: 1, nested: { gain: 0.5, pan: 0 } }
  const reordered = { nested: { pan: 0, gain: 0.5 }, speed: 1, mode: 'scientific' }
  assert.equal(settingsHash(base), settingsHash(reordered))
  assert.notEqual(settingsHash(base), settingsHash({ ...base, speed: 2 }))
  assert.match(settingsHash(base), /^[0-9a-f]{8}$/)
})
