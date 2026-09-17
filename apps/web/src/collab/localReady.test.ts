import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { watchLocalReadiness, type LocalReadiness } from './localReady.js'
import type { LocalPersistenceOutcome } from './session.js'

function deferred() {
  let resolve!: (outcome: LocalPersistenceOutcome) => void
  const promise = new Promise<LocalPersistenceOutcome>((done) => {
    resolve = done
  })

  return { promise, resolve }
}

describe('watchLocalReadiness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('becomes ready as soon as local data loads and clears the timer', async () => {
    const local = deferred()
    const changes: LocalReadiness[] = []

    watchLocalReadiness(local.promise, 3000, (readiness) => changes.push(readiness))
    local.resolve('loaded')
    await vi.advanceTimersByTimeAsync(0)

    expect(changes).toEqual([{ ready: true, offlineStorageAvailable: true }])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('opens the editor when storage is slow without flagging it unavailable', async () => {
    const local = deferred()
    const changes: LocalReadiness[] = []

    watchLocalReadiness(local.promise, 3000, (readiness) => changes.push(readiness))
    await vi.advanceTimersByTimeAsync(3000)

    expect(changes).toEqual([{ ready: true, offlineStorageAvailable: true }])

    local.resolve('loaded')
    await vi.advanceTimersByTimeAsync(0)

    expect(changes.at(-1)).toEqual({ ready: true, offlineStorageAvailable: true })
  })

  it('flags storage unavailable when the probe fails, even after a slow start', async () => {
    const local = deferred()
    const changes: LocalReadiness[] = []

    watchLocalReadiness(local.promise, 3000, (readiness) => changes.push(readiness))
    await vi.advanceTimersByTimeAsync(3000)
    local.resolve('unavailable')
    await vi.advanceTimersByTimeAsync(0)

    expect(changes.at(-1)).toEqual({ ready: true, offlineStorageAvailable: false })
  })

  it('reports nothing after it is stopped', async () => {
    const local = deferred()
    const changes: LocalReadiness[] = []

    const stop = watchLocalReadiness(local.promise, 3000, (readiness) => changes.push(readiness))
    stop()
    expect(vi.getTimerCount()).toBe(0)

    local.resolve('loaded')
    await vi.advanceTimersByTimeAsync(5000)

    expect(changes).toEqual([])
  })
})
