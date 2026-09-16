import { describe, expect, it } from 'vitest'
import {
  applyStatusChange,
  deriveConnectionState,
  deriveConnectionToast,
  type ConnectionInput,
  type ConnectionState,
  type ConnectionToastResult,
} from './connection.js'

describe('deriveConnectionState', () => {
  it('is offline when the browser reports no network', () => {
    expect(
      deriveConnectionState({ status: 'connected', synced: true, online: false }),
    ).toBe('offline')
  })

  it('is offline when the socket is disconnected', () => {
    expect(
      deriveConnectionState({ status: 'disconnected', synced: false, online: true }),
    ).toBe('offline')
  })

  it('is connecting while the socket opens', () => {
    expect(
      deriveConnectionState({ status: 'connecting', synced: false, online: true }),
    ).toBe('connecting')
  })

  it('is syncing once connected but before the first sync completes', () => {
    expect(
      deriveConnectionState({ status: 'connected', synced: false, online: true }),
    ).toBe('syncing')
  })

  it('is synced when connected and synced', () => {
    expect(
      deriveConnectionState({ status: 'connected', synced: true, online: true }),
    ).toBe('synced')
  })

  it('reports offline even mid-connection when the network is gone', () => {
    expect(
      deriveConnectionState({ status: 'connecting', synced: false, online: false }),
    ).toBe('offline')
  })
})

describe('applyStatusChange', () => {
  it('clears synced when the socket disconnects', () => {
    const input: ConnectionInput = { status: 'connected', synced: true, online: true }

    const result = applyStatusChange(input, 'disconnected')

    expect(result.synced).toBe(false)
    expect(result.status).toBe('disconnected')
  })

  it('clears synced when the socket starts reconnecting', () => {
    const input: ConnectionInput = { status: 'disconnected', synced: true, online: true }

    const result = applyStatusChange(input, 'connecting')

    expect(result.synced).toBe(false)
    expect(result.status).toBe('connecting')
  })

  it('clears an existing synced flag on any transition away from connected', () => {
    const input: ConnectionInput = { status: 'connected', synced: true, online: true }

    const result = applyStatusChange(input, 'connecting')

    expect(result.synced).toBe(false)
    expect(result.status).toBe('connecting')
  })

  it('does not mutate the input it is given', () => {
    const input: ConnectionInput = { status: 'connected', synced: true, online: true }

    applyStatusChange(input, 'disconnected')

    expect(input).toEqual({ status: 'connected', synced: true, online: true })
  })

  it('reports syncing, not synced, on the reconnect leg after a drop', () => {
    let input: ConnectionInput = { status: 'connected', synced: true, online: true }

    input = applyStatusChange(input, 'disconnected')
    expect(deriveConnectionState(input)).toBe('offline')

    input = applyStatusChange(input, 'connecting')
    expect(deriveConnectionState(input)).toBe('connecting')

    input = applyStatusChange(input, 'connected')
    expect(deriveConnectionState(input)).toBe('syncing')
  })
})

describe('deriveConnectionToast', () => {
  function runSequence(states: ConnectionState[]): ConnectionToastResult[] {
    let inOfflineEpisode = false
    const results: ConnectionToastResult[] = []

    for (const connection of states) {
      const result = deriveConnectionToast(inOfflineEpisode, connection)
      inOfflineEpisode = result.inOfflineEpisode
      results.push(result)
    }

    return results
  }

  it('shows the offline toast on first entering an offline episode', () => {
    expect(deriveConnectionToast(false, 'offline')).toEqual({
      toast: 'offline',
      inOfflineEpisode: true,
    })
  })

  it('shows nothing for an offline reading while already in an episode', () => {
    expect(deriveConnectionToast(true, 'offline')).toEqual({
      toast: null,
      inOfflineEpisode: true,
    })
  })

  it('shows the back-online toast when reaching synced from an open episode', () => {
    expect(deriveConnectionToast(true, 'synced')).toEqual({
      toast: 'back-online',
      inOfflineEpisode: false,
    })
  })

  it('shows nothing when reaching synced with no open episode', () => {
    expect(deriveConnectionToast(false, 'synced')).toEqual({
      toast: null,
      inOfflineEpisode: false,
    })
  })

  it('shows nothing for the intermediate connecting and syncing states', () => {
    expect(deriveConnectionToast(false, 'connecting')).toEqual({
      toast: null,
      inOfflineEpisode: false,
    })
    expect(deriveConnectionToast(true, 'connecting')).toEqual({
      toast: null,
      inOfflineEpisode: true,
    })
    expect(deriveConnectionToast(false, 'syncing')).toEqual({
      toast: null,
      inOfflineEpisode: false,
    })
    expect(deriveConnectionToast(true, 'syncing')).toEqual({
      toast: null,
      inOfflineEpisode: true,
    })
  })

  it('announces exactly one offline toast and one recovery toast across a clean drop and reconnect', () => {
    const results = runSequence(['connecting', 'offline', 'connecting', 'syncing', 'synced'])
    const toasts = results.map((result) => result.toast)

    expect(toasts).toEqual([null, 'offline', null, null, 'back-online'])
    expect(toasts.filter((toastKind) => toastKind === 'offline')).toHaveLength(1)
    expect(toasts.filter((toastKind) => toastKind === 'back-online')).toHaveLength(1)
  })

  it('announces the offline toast only once while the connection flaps before recovering', () => {
    const results = runSequence([
      'connecting',
      'synced',
      'offline',
      'connecting',
      'offline',
      'connecting',
      'offline',
      'syncing',
      'synced',
    ])
    const toasts = results.map((result) => result.toast)

    expect(toasts.filter((toastKind) => toastKind === 'offline')).toHaveLength(1)
    expect(toasts.filter((toastKind) => toastKind === 'back-online')).toHaveLength(1)
    expect(toasts.at(-1)).toBe('back-online')
  })

  it('announces nothing when a session connects cleanly with no offline episode', () => {
    const results = runSequence(['connecting', 'syncing', 'synced'])
    const toasts = results.map((result) => result.toast)

    expect(toasts).toEqual([null, null, null])
  })
})
