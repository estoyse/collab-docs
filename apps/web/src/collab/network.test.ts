import { describe, expect, it } from 'vitest'
import { bindNetworkToProvider, type NetworkEventTarget } from './network.js'

function fakeWindow() {
  const listeners = new Map<string, Set<() => void>>()

  const target = {
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
  } as unknown as NetworkEventTarget

  return {
    target,
    dispatch: (type: 'online' | 'offline') => {
      for (const listener of listeners.get(type) ?? []) {
        listener()
      }
    },
    count: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
  }
}

function fakeProvider() {
  const calls: string[] = []

  return {
    calls,
    connect: () => calls.push('connect'),
    disconnect: () => calls.push('disconnect'),
  }
}

describe('bindNetworkToProvider', () => {
  it('disconnects when the browser goes offline and reconnects immediately when it returns', () => {
    const network = fakeWindow()
    const provider = fakeProvider()
    const changes: boolean[] = []

    bindNetworkToProvider(network.target, { onLine: true }, provider, (online) => changes.push(online))

    expect(provider.calls).toEqual([])

    network.dispatch('offline')
    network.dispatch('online')

    expect(provider.calls).toEqual(['disconnect', 'connect'])
    expect(changes).toEqual([false, true])
  })

  it('disconnects straight away when the browser starts offline', () => {
    const network = fakeWindow()
    const provider = fakeProvider()
    const changes: boolean[] = []

    bindNetworkToProvider(network.target, { onLine: false }, provider, (online) => changes.push(online))

    expect(provider.calls).toEqual(['disconnect'])
    expect(changes).toEqual([false])
  })

  it('stops reacting once unsubscribed', () => {
    const network = fakeWindow()
    const provider = fakeProvider()

    const unsubscribe = bindNetworkToProvider(network.target, { onLine: true }, provider)
    expect(network.count()).toBe(2)

    unsubscribe()
    network.dispatch('offline')
    network.dispatch('online')

    expect(network.count()).toBe(0)
    expect(provider.calls).toEqual([])
  })

  it('leaves no listeners behind across a mount, unmount and remount', () => {
    const network = fakeWindow()
    const first = fakeProvider()
    const second = fakeProvider()

    bindNetworkToProvider(network.target, { onLine: true }, first)()
    bindNetworkToProvider(network.target, { onLine: true }, second)

    network.dispatch('offline')

    expect(network.count()).toBe(2)
    expect(first.calls).toEqual([])
    expect(second.calls).toEqual(['disconnect'])
  })
})
