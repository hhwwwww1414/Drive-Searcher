// Lightweight map interaction stubs. If a map exists, you can
// subscribe to these browser events to integrate highlighting and fit.

export type HighlightOptions = { temporary?: boolean }

export function highlightPath(path: string[], opts: HighlightOptions = {}) {
  try {
    window.dispatchEvent(new CustomEvent('highlightPath', { detail: { path, ...opts } }))
  } catch {
    // noop in SSR or restricted env
  }
}

export function fitToPath(path: string[]) {
  try {
    window.dispatchEvent(new CustomEvent('fitToPath', { detail: { path } }))
  } catch {
    // noop
  }
}

export function clearHighlight() {
  try {
    window.dispatchEvent(new CustomEvent('clearHighlight'))
  } catch {
    // noop
  }
}

export function highlightSegment(path: string[]) {
  try {
    window.dispatchEvent(new CustomEvent('highlightSegment', { detail: { path } }))
  } catch {
    // noop
  }
}

