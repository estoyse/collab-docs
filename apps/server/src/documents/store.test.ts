import * as Y from 'yjs'
import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD } from '@collab-docs/shared'
import { applySchema, type Db } from '../db.js'
import { createDocumentStore, type DocumentStore } from './store.js'

function encodedDocState(paragraphs: string[]): Uint8Array {
  const doc = new Y.Doc()
  const fragment = doc.getXmlFragment(DOC_BODY_FIELD)

  fragment.insert(
    0,
    paragraphs.map((text) => {
      const paragraph = new Y.XmlElement('paragraph')
      paragraph.insert(0, [new Y.XmlText(text)])
      return paragraph
    }),
  )

  return Y.encodeStateAsUpdate(doc)
}

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
    expect(created.excerpt).toBe('')
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

  it('round-trips binary state and updates the title and excerpt', () => {
    const created = store.create()
    const state = new Uint8Array([1, 2, 3, 250])

    store.saveState(created.id, state, 'Renamed', 'A short preview')

    expect(store.loadState(created.id)).toEqual(state)
    expect(store.get(created.id)?.title).toBe('Renamed')
    expect(store.get(created.id)?.excerpt).toBe('A short preview')
  })

  it('creates a row when saving state for an id that does not exist yet', () => {
    store.saveState('fresh-id', new Uint8Array([9]), 'Made by sync', 'Preview text')

    expect(store.get('fresh-id')?.title).toBe('Made by sync')
    expect(store.get('fresh-id')?.excerpt).toBe('Preview text')
  })

  it('lists newest first', async () => {
    const older = store.create('Older')
    store.saveState(older.id, new Uint8Array([1]), 'Older', '')
    await new Promise((resolve) => setTimeout(resolve, 2))
    const newer = store.create('Newer')
    store.saveState(newer.id, new Uint8Array([1]), 'Newer', '')

    expect(store.list().map((d) => d.title)).toEqual(['Newer', 'Older'])
  })

  describe('backfillExcerpts', () => {
    it('fills in the excerpt for rows saved before the excerpt column existed, without touching updated_at', () => {
      const created = store.create('Old doc')
      const updatedAt = store.get(created.id)?.updatedAt
      const state = encodedDocState(['First line', 'Second line'])

      const db = new Database(':memory:')
      applySchema(db)
      db.exec('DELETE FROM documents')
      db.prepare(
        'INSERT INTO documents (id, title, excerpt, updated_at, state) VALUES (?, ?, ?, ?, ?)',
      ).run(created.id, 'Old doc', '', updatedAt, Buffer.from(state))
      const backfillStore = createDocumentStore(db)

      const updatedCount = backfillStore.backfillExcerpts()

      expect(updatedCount).toBe(1)
      const summary = backfillStore.get(created.id)
      expect(summary?.excerpt).toBe('Second line')
      expect(summary?.updatedAt).toBe(updatedAt)
    })

    it('does nothing when there are no rows to backfill', () => {
      store.create('Fresh doc')

      expect(store.backfillExcerpts()).toBe(0)
    })
  })
})

describe('applySchema migration', () => {
  it('adds the excerpt column to a database created with the old schema', () => {
    const db: Db = new Database(':memory:')
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        state BLOB
      )
    `)
    db.prepare('INSERT INTO documents (id, title, updated_at, state) VALUES (?, ?, ?, NULL)').run(
      'legacy-id',
      'Legacy doc',
      Date.now(),
    )

    applySchema(db)

    const store = createDocumentStore(db)
    expect(store.get('legacy-id')?.excerpt).toBe('')

    const created = store.create('New doc')
    expect(store.list().map((d) => d.id)).toEqual(expect.arrayContaining(['legacy-id', created.id]))
  })
})
