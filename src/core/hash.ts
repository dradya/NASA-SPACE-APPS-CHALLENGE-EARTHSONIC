// Deterministic fingerprints for "same inputs, same sound" checks.
// Not cryptographic: it detects accidental change (for example in golden tests), nothing more.

/** JSON with sorted object keys and no whitespace, so key order can never change the result. */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false'
    case 'string':
      return JSON.stringify(value)
    case 'number':
      // JSON would silently turn NaN/Infinity into null, which would hide data problems.
      if (!Number.isFinite(value)) {
        throw new TypeError(`canonicalJson: non-finite number (${String(value)}) cannot be fingerprinted`)
      }
      return JSON.stringify(value)
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalJson(item === undefined ? null : item)).join(',')}]`
      }
      const record = value as Record<string, unknown>
      const parts: string[] = []
      for (const key of Object.keys(record).sort()) {
        if (record[key] === undefined) continue // like JSON.stringify: undefined properties are omitted
        parts.push(`${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      }
      return `{${parts.join(',')}}`
    }
    default:
      throw new TypeError(`canonicalJson: unsupported value of type ${typeof value}`)
  }
}

/** UTF-8 bytes of a string, without relying on TextEncoder (keeps `core` free of DOM and Node types). */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0) as number
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return bytes
}

/** 32-bit FNV-1a hash of the UTF-8 bytes of `text`, as 8 lowercase hex characters. */
export function fnv1a32Hex(text: string): string {
  let hash = 0x811c9dc5
  for (const byte of utf8Bytes(text)) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Fingerprint of any JSON-like settings object, independent of key order. */
export function settingsHash(value: unknown): string {
  return fnv1a32Hex(canonicalJson(value))
}
