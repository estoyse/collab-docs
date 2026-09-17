import * as Y from 'yjs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD, DOC_TITLE_KEY } from '@collab-docs/shared'
import {
  appendParagraph,
  bodyText,
  countOccurrences,
  createCollabHarness,
  docsConverged,
  isDisconnected,
  isSynced,
  paragraph,
  paragraphText,
  seededRandom,
  titleText,
  waitFor,
  type RunningServer,
} from '../test/collabHarness.js'

function expectEachOnce(text: string, markers: string[]): void {
  for (const marker of markers) {
    expect(countOccurrences(text, marker), marker).toBe(1)
  }
}

describe('collaborative sync', { timeout: 15000 }, () => {
  let harness: ReturnType<typeof createCollabHarness>
  let server: RunningServer

  beforeEach(async () => {
    harness = createCollabHarness()
    server = await harness.startServer()
  })

  afterEach(async () => {
    await harness.cleanup()
  })

  it('converges two clients typing concurrently into the same paragraph', async () => {
    const name = 'realtime'
    const seed = 'seed paragraph'
    const insertsPerClient = 300
    const alice = harness.connect(server, name)
    const bob = harness.connect(server, name)
    await waitFor(() => isSynced(alice) && isSynced(bob), 5000, 'initial sync')

    alice.doc.getXmlFragment(DOC_BODY_FIELD).insert(0, [paragraph(seed)])
    await waitFor(() => bodyText(bob.doc) === bodyText(alice.doc), 5000, 'seed paragraph')

    const random = seededRandom(20260917)

    for (let index = 0; index < insertsPerClient; index++) {
      const aliceText = paragraphText(alice.doc, 0)
      aliceText.insert(Math.floor(random() * (aliceText.length + 1)), 'x')

      const bobText = paragraphText(bob.doc, 0)
      bobText.insert(Math.floor(random() * (bobText.length + 1)), 'y')

      if (index % 10 === 0) {
        await new Promise((resolve) => setImmediate(resolve))
      }
    }

    await waitFor(
      () => docsConverged(alice.doc, bob.doc) && isSynced(alice) && isSynced(bob),
      10000,
      'concurrent typing convergence',
    )

    const merged = paragraphText(alice.doc, 0).toString()

    expect(bodyText(bob.doc)).toBe(bodyText(alice.doc))
    expect(merged).toHaveLength(seed.length + insertsPerClient * 2)
    expect(countOccurrences(merged, 'x')).toBe(insertsPerClient)
    expect(countOccurrences(merged, 'y')).toBe(insertsPerClient)
    expect(merged.replace(/[xy]/g, '')).toBe(seed)
    expect(alice.doc.getXmlFragment(DOC_BODY_FIELD).length).toBe(1)
  })

  it('merges edits made by a disconnected client with edits made online', async () => {
    const name = 'offline-merge'
    const alice = harness.connect(server, name)
    const bob = harness.connect(server, name)
    const carol = harness.connect(server, name)
    await waitFor(() => [alice, bob, carol].every(isSynced), 5000, 'initial sync')

    alice.doc.getXmlFragment(DOC_BODY_FIELD).insert(0, [
      paragraph('alpha'),
      paragraph('bravo'),
      paragraph('charlie'),
    ])
    await waitFor(
      () => docsConverged(alice.doc, bob.doc, carol.doc) && bodyText(bob.doc).includes('charlie'),
      5000,
      'seed paragraphs',
    )

    bob.provider.disconnect()
    await waitFor(() => isDisconnected(bob), 5000, 'bob disconnect')

    paragraphText(alice.doc, 0).insert(0, '[A-p0-start]')
    paragraphText(alice.doc, 1).insert(paragraphText(alice.doc, 1).length, '[A-p1-end]')
    appendParagraph(alice.doc, '[A-new-paragraph]')
    paragraphText(carol.doc, 2).insert(0, '[C-p2-start]')

    paragraphText(bob.doc, 0).insert(0, '[B-p0-start]')
    paragraphText(bob.doc, 0).insert(paragraphText(bob.doc, 0).length, '[B-p0-end]')
    paragraphText(bob.doc, 2).insert(3, '[B-p2-mid]')
    appendParagraph(bob.doc, '[B-new-paragraph]')

    await waitFor(
      () =>
        docsConverged(alice.doc, carol.doc) &&
        bodyText(carol.doc).includes('[A-new-paragraph]') &&
        bodyText(alice.doc).includes('[C-p2-start]'),
      5000,
      'online clients converge while bob is offline',
    )

    expect(bodyText(bob.doc)).not.toContain('[A-p0-start]')
    expect(bodyText(bob.doc)).not.toContain('[C-p2-start]')
    expect(bodyText(alice.doc)).not.toContain('[B-p0-start]')

    await bob.provider.connect()

    await waitFor(
      () => docsConverged(alice.doc, bob.doc, carol.doc) && [alice, bob, carol].every(isSynced),
      10000,
      'three-way convergence after reconnect',
    )

    const merged = bodyText(carol.doc)

    expectEachOnce(merged, [
      'alpha',
      'bravo',
      'cha',
      'rlie',
      '[A-p0-start]',
      '[A-p1-end]',
      '[A-new-paragraph]',
      '[C-p2-start]',
      '[B-p0-start]',
      '[B-p0-end]',
      '[B-p2-mid]',
      '[B-new-paragraph]',
    ])
    expect(carol.doc.getXmlFragment(DOC_BODY_FIELD).length).toBe(5)
    expect(paragraphText(carol.doc, 0).toString().replace(/\[[AB]-p0-(start|end)\]/g, '')).toBe(
      'alpha',
    )
    expect(paragraphText(carol.doc, 2).toString()).toContain('cha[B-p2-mid]rlie')
  })

  it('merges a reloaded offline client restored from a local snapshot', async () => {
    const name = 'offline-reload'
    const alice = harness.connect(server, name)
    const bob = harness.connect(server, name)
    await waitFor(() => isSynced(alice) && isSynced(bob), 5000, 'initial sync')

    alice.doc.getXmlFragment(DOC_BODY_FIELD).insert(0, [paragraph('shared seed')])
    await waitFor(() => bodyText(bob.doc).includes('shared seed'), 5000, 'seed paragraph')

    bob.provider.disconnect()
    await waitFor(() => isDisconnected(bob), 5000, 'bob disconnect')

    paragraphText(bob.doc, 0).insert(0, '[B-offline-p0]')
    appendParagraph(bob.doc, '[B-offline-new]')
    const localSnapshot = Y.encodeStateAsUpdate(bob.doc)
    bob.destroy()

    paragraphText(alice.doc, 0).insert(paragraphText(alice.doc, 0).length, '[A-while-B-away]')
    appendParagraph(alice.doc, '[A-new-paragraph]')
    await waitFor(() => isSynced(alice), 5000, 'alice edits acknowledged')

    const restoredDoc = new Y.Doc()
    Y.applyUpdate(restoredDoc, localSnapshot)
    const restoredBob = harness.connect(server, name, { doc: restoredDoc })

    await waitFor(
      () =>
        isSynced(restoredBob) &&
        isSynced(alice) &&
        docsConverged(alice.doc, restoredBob.doc) &&
        bodyText(alice.doc).includes('[B-offline-new]'),
      10000,
      'restored client convergence',
    )

    const viewer = harness.connect(server, name)
    await waitFor(
      () => isSynced(viewer) && docsConverged(alice.doc, restoredBob.doc, viewer.doc),
      5000,
      'fresh viewer sees merged document',
    )

    const markers = [
      'shared seed',
      '[B-offline-p0]',
      '[B-offline-new]',
      '[A-while-B-away]',
      '[A-new-paragraph]',
    ]
    expectEachOnce(bodyText(viewer.doc), markers)
    expect(viewer.doc.getXmlFragment(DOC_BODY_FIELD).length).toBe(3)

    Y.applyUpdate(restoredBob.doc, localSnapshot)
    appendParagraph(restoredBob.doc, '[B-after-reapply]')

    await waitFor(
      () =>
        docsConverged(alice.doc, restoredBob.doc, viewer.doc) &&
        bodyText(viewer.doc).includes('[B-after-reapply]'),
      5000,
      'convergence after reapplying a stale snapshot',
    )

    expectEachOnce(bodyText(viewer.doc), [...markers, '[B-after-reapply]'])
    expect(viewer.doc.getXmlFragment(DOC_BODY_FIELD).length).toBe(4)
  })

  it('converges concurrent inserts into the title', async () => {
    const name = 'title-race'
    const alice = harness.connect(server, name)
    const bob = harness.connect(server, name)
    await waitFor(() => isSynced(alice) && isSynced(bob), 5000, 'initial sync')

    alice.doc.getText(DOC_TITLE_KEY).insert(0, 'Quarterly')
    await waitFor(() => titleText(bob.doc) === 'Quarterly', 5000, 'seed title')

    const aliceTitle = alice.doc.getText(DOC_TITLE_KEY)
    const bobTitle = bob.doc.getText(DOC_TITLE_KEY)
    aliceTitle.insert(aliceTitle.length, ' report')
    aliceTitle.insert(0, '[A]')
    bobTitle.insert(0, 'Draft ')
    bobTitle.insert(0, '[B]')

    await waitFor(
      () => docsConverged(alice.doc, bob.doc) && isSynced(alice) && isSynced(bob),
      5000,
      'title convergence',
    )

    const merged = titleText(alice.doc)

    expect(titleText(bob.doc)).toBe(merged)
    expectEachOnce(merged, ['[A]', '[B]', 'Draft ', 'Quarterly report'])
    expect(merged).toHaveLength('[A][B]Draft Quarterly report'.length)
  })
})
