import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadIdentity, saveIdentity } from './identity.js'

describe('identity', () => {
  beforeEach(() => {
    const store = new Map<string, string>()

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    })
  })

  it('returns null before anything is saved', () => {
    expect(loadIdentity()).toBeNull()
  })

  it('round-trips a saved identity', () => {
    const saved = saveIdentity('  Alice  ')

    expect(saved.name).toBe('Alice')
    expect(loadIdentity()).toEqual(saved)
  })

  it('assigns the colour from the name', () => {
    expect(saveIdentity('Alice').color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('returns null rather than throwing when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })

    expect(loadIdentity()).toBeNull()
    expect(() => saveIdentity('Alice')).not.toThrow()
  })

  it('returns null for corrupted stored data', () => {
    localStorage.setItem('collab-docs:identity', 'not json')

    expect(loadIdentity()).toBeNull()
  })
})
