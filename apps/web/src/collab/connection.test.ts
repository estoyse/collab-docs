import { describe, expect, it } from 'vitest'
import { deriveConnectionState } from './connection.js'

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
