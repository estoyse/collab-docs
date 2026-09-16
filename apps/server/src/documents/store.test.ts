import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySchema } from '../db.js'
import { createDocumentStore, type DocumentStore } from './store.js'

describe('document store', () => {
  let store: DocumentStore

  beforeEach(() => {
    const db = new Database(':memory:')
    applySchema(db)
    store = createDocumentStore(db)
  })

  it('starts empty', () => {
    expect(store.list()).toEqual([])
  })

  it('creates a document with a default title', () => {
    const created = store.create()
    expect(created.title).toBe('Untitled')
    expect(created.id).toMatch(/^[a-z0-9]{10}$/)
    expect(store.list()).toHaveLength(1)
  })

  it('creates a document with a given title', () => {
    const created = store.create('Design notes')
    expect(store.get(created.id)?.title).toBe('Design notes')
  })

  it('returns null for an unknown document', () => {
    expect(store.get('nope')).toBeNull()
    expect(store.loadState('nope')).toBeNull()
  })

  it('round-trips binary state and updates the title', () => {
    const created = store.create()
    const state = new Uint8Array([1, 2, 3, 250])

    store.saveState(created.id, state, 'Renamed')

    expect(store.loadState(created.id)).toEqual(state)
    expect(store.get(created.id)?.title).toBe('Renamed')
  })

  it('creates a row when saving state for an id that does not exist yet', () => {
    store.saveState('fresh-id', new Uint8Array([9]), 'Made by sync')

    expect(store.get('fresh-id')?.title).toBe('Made by sync')
  })

  it('lists newest first', async () => {
    const older = store.create('Older')
    store.saveState(older.id, new Uint8Array([1]), 'Older')
    await new Promise((resolve) => setTimeout(resolve, 2))
    const newer = store.create('Newer')
    store.saveState(newer.id, new Uint8Array([1]), 'Newer')

    expect(store.list().map((d) => d.title)).toEqual(['Newer', 'Older'])
  })
})
