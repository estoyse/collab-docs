import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentSummary } from '@collab-docs/shared'
import { loadCachedDocuments, saveCachedDocuments } from './documentsCache.js'

const documents: DocumentSummary[] = [
  { id: 'doc-1', title: 'Q3 report', excerpt: 'Revenue grew.', updatedAt: 1_700_000_000_000 },
  { id: 'doc-2', title: '', excerpt: '', updatedAt: 1_700_000_100_000 },
]

describe('documents cache', () => {
  beforeEach(() => {
    const store = new Map<string, string>()

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    })
  })

  it('returns null before anything is cached', () => {
    expect(loadCachedDocuments()).toBeNull()
  })

  it('round-trips the saved list', () => {
    saveCachedDocuments(documents)

    expect(loadCachedDocuments()).toEqual(documents)
  })

  it('keeps an empty list distinct from no cache', () => {
    saveCachedDocuments([])

    expect(loadCachedDocuments()).toEqual([])
  })

  it('returns null for corrupted or malformed data', () => {
    localStorage.setItem('collab-docs:documents', 'not json')
    expect(loadCachedDocuments()).toBeNull()

    localStorage.setItem('collab-docs:documents', JSON.stringify({ id: 'doc-1' }))
    expect(loadCachedDocuments()).toBeNull()

    localStorage.setItem('collab-docs:documents', JSON.stringify([{ id: 'doc-1', title: 3 }]))
    expect(loadCachedDocuments()).toBeNull()
  })

  it('never throws when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })

    expect(() => saveCachedDocuments(documents)).not.toThrow()
    expect(loadCachedDocuments()).toBeNull()
  })

  it('never throws when storage is missing entirely', () => {
    vi.stubGlobal('localStorage', undefined)

    expect(() => saveCachedDocuments(documents)).not.toThrow()
    expect(loadCachedDocuments()).toBeNull()
  })
})
