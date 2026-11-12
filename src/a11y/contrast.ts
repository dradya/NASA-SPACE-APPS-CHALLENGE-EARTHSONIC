// High-contrast preference: a saved choice wins; otherwise follow the operating system.
// The preference is applied as data-contrast="high" | "normal" on <html>; src/styles/index.css reacts to "high".

export type ContrastMode = 'normal' | 'high'

export const CONTRAST_STORAGE_KEY = 'earthsonic:contrast'

export function parseContrastMode(value: unknown): ContrastMode | null {
  return value === 'high' || value === 'normal' ? value : null
}

/** A saved choice wins. Otherwise follow the operating-system request for more contrast. */
export function resolveInitialContrast(
  stored: ContrastMode | null,
  systemPrefersMore: boolean,
): ContrastMode {
  return stored ?? (systemPrefersMore ? 'high' : 'normal')
}

export function currentContrast(): ContrastMode {
  if (typeof document === 'undefined') return 'normal'
  return document.documentElement.dataset.contrast === 'high' ? 'high' : 'normal'
}

export function applyContrast(mode: ContrastMode): void {
  document.documentElement.dataset.contrast = mode
}

export function readStoredContrast(): ContrastMode | null {
  try {
    return parseContrastMode(window.localStorage.getItem(CONTRAST_STORAGE_KEY))
  } catch {
    return null // storage can be unavailable (private mode, blocked cookies): behave as "nothing saved"
  }
}

export function storeContrast(mode: ContrastMode): void {
  try {
    window.localStorage.setItem(CONTRAST_STORAGE_KEY, mode)
  } catch {
    // Not remembered between visits; the current page still switches.
  }
}

/** Called once, before the first render. */
export function initContrast(): ContrastMode {
  const systemPrefersMore =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-contrast: more)').matches
  const mode = resolveInitialContrast(readStoredContrast(), systemPrefersMore)
  applyContrast(mode)
  return mode
}
