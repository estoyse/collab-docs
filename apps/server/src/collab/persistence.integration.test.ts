import * as Y from 'yjs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD, DOC_TITLE_KEY } from '@collab-docs/shared'
import type { DocumentStore } from '../documents/store.js'
import {
  bodyText,
  createCollabHarness,
  docsConverged,
  isSynced,
  paragraph,
  paragraphText,
  titleText,
  waitFor,
} from '../test/collabHarness.js'

function storedDoc(store: DocumentStore, name: string): Y.Doc | null {
  const state = store.loadState(name)

  if (!state) {
    return null
  }

  const doc = new Y.Doc()
  Y.applyUpdate(doc, state)

  return doc
}

function storeMatches(store: DocumentStore, name: string, expected: Y.Doc): boolean {
  const doc = storedDoc(store, name)

  if (!doc) {
    return false
  }

  const matches = docsConverged(doc, expected)
  doc.destroy()

  return matches
}

describe('document persistence', { timeout: 15000 }, () => {
  let harness: ReturnType<typeof createCollabHarness>

  beforeEach(() => {
    harness = createCollabHarness()
  })

  afterEach(async () => {
    await harness.cleanup()
  })

  it('restores body and title after a server restart on the same database', async () => {
    const name = 'restart'
    const databasePath = harness.tempDatabasePath()
    const firstServer = await harness.startServer(databasePath)
    const author = harness.connect(firstServer, name)
    await waitFor(() => isSynced(author), 5000, 'initial sync')

    author.doc.transact(() => {
      author.doc.getText(DOC_TITLE_KEY).insert(0, 'Persisted title')
      author.doc
        .getXmlFragment(DOC_BODY_FIELD)
        .insert(0, [paragraph('First line [p-1]'), paragraph('Second line [p-2]')])
    })

    await waitFor(
      () => isSynced(author) && storeMatches(firstServer.store, name, author.doc),
      8000,
      'store to contain the edits',
    )

    const expectedBody = bodyText(author.doc)
    const expectedTitle = titleText(author.doc)
    const expectedExcerpt = 'First line [p-1]\nSecond line [p-2]'

    expect(firstServer.store.get(name)).toMatchObject({
      id: name,
      title: 'Persisted title',
      excerpt: expectedExcerpt,
    })

    author.destroy()
    await firstServer.stop()

    const secondServer = await harness.startServer(databasePath)
    const reader = harness.connect(secondServer, name)
    await waitFor(
      () => isSynced(reader) && bodyText(reader.doc) === expectedBody,
      5000,
      'reader loads persisted document',
    )

    expect(titleText(reader.doc)).toBe(expectedTitle)
    expect(reader.doc.getXmlFragment(DOC_BODY_FIELD).length).toBe(2)
    expect(secondServer.store.list()).toEqual([
      expect.objectContaining({ id: name, title: 'Persisted title', excerpt: expectedExcerpt }),
    ])
  })

  it('flushes edits still inside the debounce window on graceful shutdown', async () => {
    const name = 'graceful-shutdown'
    const databasePath = harness.tempDatabasePath()
    const firstServer = await harness.startServer(databasePath)
    const author = harness.connect(firstServer, name)
    const observer = harness.connect(firstServer, name)
    await waitFor(() => isSynced(author) && isSynced(observer), 5000, 'initial sync')

    author.doc.getXmlFragment(DOC_BODY_FIELD).insert(0, [paragraph('before')])
    await waitFor(
      () => storeMatches(firstServer.store, name, author.doc),
      8000,
      'first store',
    )

    paragraphText(author.doc, 0).insert(0, '[inside-debounce]')
    await waitFor(
      () => isSynced(author) && docsConverged(author.doc, observer.doc),
      5000,
      'edit reaches the server',
    )
    const expectedBody = bodyText(author.doc)

    firstServer.server.hocuspocus.flushPendingStores()
    await firstServer.stop()

    const secondServer = await harness.startServer(databasePath)
    const reader = harness.connect(secondServer, name)
    await waitFor(() => isSynced(reader), 5000, 'reader sync')

    expect(bodyText(reader.doc)).toBe(expectedBody)
    expect(secondServer.store.get(name)?.title).toBe('[inside-debounce]before')
  })
})
