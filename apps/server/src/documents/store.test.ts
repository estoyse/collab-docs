import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as Y from 'yjs'
import { createClient } from '@libsql/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD } from '@collab-docs/shared'
import { applySchema, localDatabasePath, openDatabase, type Db } from '../db.js'
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
  let db: Db
  let store: DocumentStore

  beforeEach(async () => {
    db = await openDatabase({ url: ':memory:' })
    store = createDocumentStore(db)
  })

  afterEach(() => {
    db.close()
  })

  it('starts empty', async () => {
    expect(await store.list()).toEqual([])
  })

  it('creates a document with a default title', async () => {
    const created = await store.create()
    expect(created.title).toBe('Untitled')
    expect(created.excerpt).toBe('')
    expect(created.id).toMatch(/^[a-z0-9]{10}$/)
    expect(await store.list()).toHaveLength(1)
  })

  it('returns null for an unknown document', async () => {
    expect(await store.get('nope')).toBeNull()
    expect(await store.loadState('nope')).toBeNull()
  })

  it('round-trips binary state and updates the title and excerpt', async () => {
    const created = await store.create()
    const state = new Uint8Array([1, 2, 3, 250])

    await store.saveState(created.id, state, 'Renamed', 'A short preview')

    expect(await store.loadState(created.id)).toEqual(state)
    expect((await store.get(created.id))?.title).toBe('Renamed')
    expect((await store.get(created.id))?.excerpt).toBe('A short preview')
  })

  it('returns every byte of a stored state exactly, as a plain Uint8Array', async () => {
    const state = new Uint8Array(4096)

    for (let index = 0; index < state.length; index += 1) {
      state[index] = (index * 131 + 7) % 256
    }

    state.set([0, 0, 0, 255, 255, 0], 1000)

    await store.saveState('binary-doc', state, 'Binary', '')
    const loaded = await store.loadState('binary-doc')

    expect(loaded).toBeInstanceOf(Uint8Array)
    expect(Buffer.isBuffer(loaded)).toBe(false)
    expect(loaded?.byteLength).toBe(state.byteLength)
    expect(Buffer.compare(Buffer.from(loaded ?? []), Buffer.from(state))).toBe(0)
  })

  it('round-trips an encoded Yjs update so the document can be rebuilt', async () => {
    const state = encodedDocState(['First line', 'Second line'])

    await store.saveState('yjs-doc', state, 'Doc', '')
    const loaded = await store.loadState('yjs-doc')
    const doc = new Y.Doc()
    Y.applyUpdate(doc, loaded ?? new Uint8Array())

    expect(loaded).toEqual(state)
    expect(doc.getXmlFragment(DOC_BODY_FIELD).length).toBe(2)
  })

  it('creates a row when saving state for an id that does not exist yet', async () => {
    await store.saveState('fresh-id', new Uint8Array([9]), 'Made by sync', 'Preview text')

    expect((await store.get('fresh-id'))?.title).toBe('Made by sync')
    expect((await store.get('fresh-id'))?.excerpt).toBe('Preview text')
  })

  it('lists newest first', async () => {
    const older = await store.create()
    await store.saveState(older.id, new Uint8Array([1]), 'Older', '')
    await new Promise((resolve) => setTimeout(resolve, 2))
    const newer = await store.create()
    await store.saveState(newer.id, new Uint8Array([1]), 'Newer', '')

    expect((await store.list()).map((d) => d.title)).toEqual(['Newer', 'Older'])
  })

  describe('backfillExcerpts', () => {
    it('fills in the excerpt for rows saved before the excerpt column existed, without touching updated_at', async () => {
      const created = await store.create()
      const updatedAt = (await store.get(created.id))?.updatedAt
      const state = encodedDocState(['First line', 'Second line'])

      const legacyDb = await openDatabase({ url: ':memory:' })
      await legacyDb.execute({
        sql: 'INSERT INTO documents (id, title, excerpt, updated_at, state) VALUES (?, ?, ?, ?, ?)',
        args: [created.id, 'Old doc', '', updatedAt ?? 0, state],
      })
      const backfillStore = createDocumentStore(legacyDb)

      const updatedCount = await backfillStore.backfillExcerpts()

      expect(updatedCount).toBe(1)
      const summary = await backfillStore.get(created.id)
      expect(summary?.excerpt).toBe('Second line')
      expect(summary?.updatedAt).toBe(updatedAt)
      legacyDb.close()
    })

    it('does nothing when there are no rows to backfill', async () => {
      await store.create()

      expect(await store.backfillExcerpts()).toBe(0)
    })
  })
})

describe('applySchema migration', () => {
  it('adds the excerpt column to a database created with the old schema', async () => {
    const db = createClient({ url: ':memory:' })
    await db.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        state BLOB
      )
    `)
    await db.execute({
      sql: 'INSERT INTO documents (id, title, updated_at, state) VALUES (?, ?, ?, NULL)',
      args: ['legacy-id', 'Legacy doc', Date.now()],
    })

    await applySchema(db)
    await applySchema(db)

    const store = createDocumentStore(db)
    expect((await store.get('legacy-id'))?.excerpt).toBe('')

    const created = await store.create()
    expect((await store.list()).map((d) => d.id)).toEqual(
      expect.arrayContaining(['legacy-id', created.id]),
    )
    db.close()
  })
})

describe('openDatabase', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('resolves local file paths from file: URLs and ignores memory and remote URLs', () => {
    expect(localDatabasePath('file:data/documents.db')).toBe('data/documents.db')
    expect(localDatabasePath('file:/tmp/docs.db')).toBe('/tmp/docs.db')
    expect(localDatabasePath('file:///tmp/docs.db')).toBe('/tmp/docs.db')
    expect(localDatabasePath(':memory:')).toBeNull()
    expect(localDatabasePath('file::memory:')).toBeNull()
    expect(localDatabasePath('libsql://collab-docs-example.turso.io')).toBeNull()
  })

  it('creates the parent directory of a file database and keeps data across reopen', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'collab-docs-store-'))
    directories.push(directory)
    const url = `file:${join(directory, 'nested', 'documents.db')}`
    const state = encodedDocState(['Persisted'])

    const first = await openDatabase({ url })
    await createDocumentStore(first).saveState('kept', state, 'Kept', 'Persisted')
    first.close()

    const second = await openDatabase({ url })
    const reopened = createDocumentStore(second)

    expect(await reopened.loadState('kept')).toEqual(state)
    expect(await reopened.get('kept')).toMatchObject({ title: 'Kept', excerpt: 'Persisted' })
    second.close()
  })
})
