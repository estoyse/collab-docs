import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { trackPendingChanges, type UnsyncedChangesSource } from './pendingChanges.js'

function fakeProvider() {
  const handlers = new Set<(data: { number: number }) => void>()

  const provider: UnsyncedChangesSource = {
    on: (_event, handler) => handlers.add(handler),
    off: (_event, handler) => handlers.delete(handler),
  }

  return {
    provider,
    report: (number: number) => {
      for (const handler of handlers) {
        handler({ number })
      }
    },
    listenerCount: () => handlers.size,
  }
}

function track(doc: Y.Doc, provider: UnsyncedChangesSource) {
  const counts: number[] = []
  const stop = trackPendingChanges(doc, provider, (pending) => counts.push(pending))

  return { counts, stop, latest: () => counts.at(-1) ?? 0 }
}

describe('trackPendingChanges', () => {
  it('counts local edits', () => {
    const doc = new Y.Doc()
    const { provider } = fakeProvider()
    const tracker = track(doc, provider)

    doc.getText('title').insert(0, 'Hello')
    doc.getXmlFragment('body').insert(0, [new Y.XmlElement('paragraph')])

    expect(tracker.latest()).toBe(2)
  })

  it('ignores updates loaded from local storage or received from the server', () => {
    const source = new Y.Doc()
    source.getText('title').insert(0, 'Saved offline')
    const saved = Y.encodeStateAsUpdate(source)

    const doc = new Y.Doc()
    const { provider } = fakeProvider()
    const tracker = track(doc, provider)
    const indexeddbOrigin = {}

    Y.applyUpdate(doc, saved, indexeddbOrigin)
    Y.applyUpdate(doc, saved, provider)

    expect(doc.getText('title').toString()).toBe('Saved offline')
    expect(tracker.counts).toEqual([])
  })

  it('clears once the server has acknowledged everything', () => {
    const doc = new Y.Doc()
    const fake = fakeProvider()
    const tracker = track(doc, fake.provider)

    doc.getText('title').insert(0, 'a')
    doc.getText('title').insert(1, 'b')
    fake.report(1)
    expect(tracker.latest()).toBe(2)

    fake.report(0)
    expect(tracker.latest()).toBe(0)
  })

  it('does not report again when already clear', () => {
    const doc = new Y.Doc()
    const fake = fakeProvider()
    const tracker = track(doc, fake.provider)

    fake.report(0)

    expect(tracker.counts).toEqual([])
  })

  it('removes its listeners when stopped', () => {
    const doc = new Y.Doc()
    const fake = fakeProvider()
    const tracker = track(doc, fake.provider)

    tracker.stop()
    doc.getText('title').insert(0, 'after stop')

    expect(tracker.counts).toEqual([])
    expect(fake.listenerCount()).toBe(0)
  })
})
