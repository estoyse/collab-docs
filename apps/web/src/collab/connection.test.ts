import { describe, expect, it } from 'vitest'
import { applyStatusChange, deriveConnectionState, type ConnectionInput } from './connection.js'

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
