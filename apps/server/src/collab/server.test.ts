import * as Y from 'yjs'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DOC_BODY_FIELD,
  DOC_SCHEMA_VERSION,
  DOC_TITLE_KEY,
  SCHEMA_MISMATCH_REASON,
  SCHEMA_VERSION_PARAMETER,
} from '@collab-docs/shared'
import { applySchema } from '../db.js'
import { createDocumentStore, type DocumentStore } from '../documents/store.js'
import * as title from './title.js'
import {
  assertSupportedClient,
  assertValidDocumentName,
  createPersistenceHooks,
} from './server.js'

function schemaMismatch(parameters: URLSearchParams): unknown {
  try {
    assertSupportedClient(parameters)
  } catch (error) {
    return error
  }

  return null
}

describe('assertSupportedClient', () => {
  it('accepts the current schema version', () => {
    const parameters = new URLSearchParams({ [SCHEMA_VERSION_PARAMETER]: String(DOC_SCHEMA_VERSION) })

    expect(() => assertSupportedClient(parameters)).not.toThrow()
  })

  it('rejects a different schema version with the schema mismatch reason', () => {
    const parameters = new URLSearchParams({
      [SCHEMA_VERSION_PARAMETER]: String(DOC_SCHEMA_VERSION + 1),
    })

    expect(schemaMismatch(parameters)).toMatchObject({ reason: SCHEMA_MISMATCH_REASON })
  })

  it('treats a missing schema version as a mismatch', () => {
    expect(schemaMismatch(new URLSearchParams())).toMatchObject({
      message: 'Client schema version mismatch',
      reason: SCHEMA_MISMATCH_REASON,
    })
  })
})

describe('assertValidDocumentName', () => {
  it('accepts ids made of letters, digits, dashes and underscores', () => {
    expect(() => assertValidDocumentName('abc_DEF-123')).not.toThrow()
  })

  it('rejects empty, too long or unsafe names', () => {
    expect(() => assertValidDocumentName('')).toThrow()
    expect(() => assertValidDocumentName('a'.repeat(65))).toThrow()
    expect(() => assertValidDocumentName('../etc/passwd')).toThrow()
  })
})

describe('createPersistenceHooks', () => {
  let db: Database.Database
  let store: DocumentStore

  beforeEach(() => {
    db = new Database(':memory:')
    applySchema(db)
    store = createDocumentStore(db)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function docWithContent(titleText: string, paragraphs: string[]): Y.Doc {
    const doc = new Y.Doc()
    doc.getText(DOC_TITLE_KEY).insert(0, titleText)
    doc.getXmlFragment(DOC_BODY_FIELD).insert(
      0,
      paragraphs.map((text) => {
        const paragraph = new Y.XmlElement('paragraph')
        paragraph.insert(0, [new Y.XmlText(text)])
        return paragraph
      }),
    )
    return doc
  }

  it('stores the state with the extracted title and excerpt, then loads it back', async () => {
    const hooks = createPersistenceHooks(store)
    const doc = docWithContent('Plan', ['First line'])
    const state = Y.encodeStateAsUpdate(doc)

    await hooks.store({ documentName: 'doc-1', state, document: doc })

    expect(store.get('doc-1')).toMatchObject({ title: 'Plan', excerpt: 'First line' })
    expect(await hooks.fetch({ documentName: 'doc-1' })).toEqual(state)
  })

  it('logs and rethrows when loading fails', async () => {
    const failure = new Error('database is locked')
    const hooks = createPersistenceHooks({
      ...store,
      loadState: () => {
        throw failure
      },
    })

    await expect(hooks.fetch({ documentName: 'doc-1' })).rejects.toBe(failure)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('doc-1'), failure)
  })

  it('logs and rethrows when saving fails', async () => {
    const failure = new Error('disk full')
    const hooks = createPersistenceHooks({
      ...store,
      saveState: () => {
        throw failure
      },
    })
    const doc = docWithContent('Plan', [])

    await expect(
      hooks.store({ documentName: 'doc-1', state: Y.encodeStateAsUpdate(doc), document: doc }),
    ).rejects.toBe(failure)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('doc-1'), failure)
  })

  it('keeps the previous title and excerpt when extraction fails', async () => {
    const hooks = createPersistenceHooks(store)
    store.saveState('doc-1', new Uint8Array([0, 0]), 'Old title', 'Old excerpt')
    vi.spyOn(title, 'extractTitle').mockImplementation(() => {
      throw new Error('malformed body')
    })
    vi.spyOn(title, 'extractExcerpt').mockImplementation(() => {
      throw new Error('malformed body')
    })
    const doc = docWithContent('New title', ['New line'])
    const state = Y.encodeStateAsUpdate(doc)

    await hooks.store({ documentName: 'doc-1', state, document: doc })

    expect(store.get('doc-1')).toMatchObject({ title: 'Old title', excerpt: 'Old excerpt' })
    expect(store.loadState('doc-1')).toEqual(state)
  })

  it('falls back to the default title and an empty excerpt for a new document', async () => {
    const hooks = createPersistenceHooks(store)
    vi.spyOn(title, 'extractTitle').mockImplementation(() => {
      throw new Error('malformed body')
    })
    vi.spyOn(title, 'extractExcerpt').mockImplementation(() => {
      throw new Error('malformed body')
    })
    const doc = docWithContent('New title', ['New line'])

    await hooks.store({ documentName: 'doc-2', state: Y.encodeStateAsUpdate(doc), document: doc })

    expect(store.get('doc-2')).toMatchObject({ title: 'Untitled', excerpt: '' })
  })
})
