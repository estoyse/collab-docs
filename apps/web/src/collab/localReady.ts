import type { LocalPersistenceOutcome } from './session.js'

export type LocalReadiness = {
  ready: boolean
  offlineStorageAvailable: boolean
}

export function watchLocalReadiness(
  whenLocalLoaded: Promise<LocalPersistenceOutcome>,
  timeoutMs: number,
  onChange: (readiness: LocalReadiness) => void,
): () => void {
  let active = true

  const timer = setTimeout(() => {
    if (active) {
      onChange({ ready: true, offlineStorageAvailable: true })
    }
  }, timeoutMs)

  void whenLocalLoaded.then((outcome) => {
    clearTimeout(timer)

    if (active) {
      onChange({ ready: true, offlineStorageAvailable: outcome === 'loaded' })
    }
  })

  return () => {
    active = false
    clearTimeout(timer)
  }
}
