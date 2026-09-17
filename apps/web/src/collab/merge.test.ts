import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD, DOC_TITLE_KEY } from '@collab-docs/shared'
import { applyTextDiff } from './ytext.js'

function sync(from: Y.Doc, to: Y.Doc): void {
  Y.applyUpdate(to, Y.encodeStateAsUpdate(from, Y.encodeStateVector(to)))
}

function syncBoth(a: Y.Doc, b: Y.Doc): void {
  sync(a, b)
  sync(b, a)
}

function body(doc: Y.Doc): Y.XmlFragment {
  return doc.getXmlFragment(DOC_BODY_FIELD)
}

function paragraph(text: string): Y.XmlElement {
  const element = new Y.XmlElement('paragraph')
  element.insert(0, [new Y.XmlText(text)])

  return element
}

function appendParagraph(doc: Y.Doc, text: string): void {
  const fragment = body(doc)
  fragment.insert(fragment.length, [paragraph(text)])
}

function paragraphText(doc: Y.Doc, index: number): Y.XmlText {
  const element = body(doc).get(index) as Y.XmlElement

  return element.get(0) as Y.XmlText
}

function paragraphs(doc: Y.Doc): string[] {
  return body(doc)
    .toArray()
    .map((node) =>
      (node as Y.XmlElement)
        .toArray()
        .map((child) => (child as Y.XmlText).toString())
        .join(''),
    )
}

function title(doc: Y.Doc): string {
  return doc.getText(DOC_TITLE_KEY).toString()
}

function occurrences(haystack: string[], needle: string): number {
  return haystack.join('\n').split(needle).length - 1
}

function peerFrom(source: Y.Doc): Y.Doc {
  const peer = new Y.Doc()
  sync(source, peer)

  return peer
}

describe('offline merge of the document body and title', () => {
  it('keeps every paragraph exactly once after two peers edit while disconnected', () => {
    const alice = new Y.Doc()
    appendParagraph(alice, 'Shared opening.')
    applyTextDiff(alice.getText(DOC_TITLE_KEY), 'Plan')
    const bob = peerFrom(alice)

    appendParagraph(alice, 'Alice offline.')
    paragraphText(alice, 0).insert(0, 'Edited by Alice. ')
    appendParagraph(bob, 'Bob offline.')
    paragraphText(bob, 0).insert(paragraphText(bob, 0).length, ' Edited by Bob.')

    expect(paragraphs(alice)).not.toEqual(paragraphs(bob))

    syncBoth(alice, bob)

    expect(paragraphs(alice)).toEqual(paragraphs(bob))
    expect(paragraphs(alice)).toHaveLength(3)
    expect(paragraphs(alice)[0]).toBe('Edited by Alice. Shared opening. Edited by Bob.')

    for (const marker of ['Shared opening.', 'Alice offline.', 'Bob offline.', 'Edited by Alice.', 'Edited by Bob.']) {
      expect(occurrences(paragraphs(alice), marker)).toBe(1)
    }

    expect(title(alice)).toBe('Plan')
    expect(title(bob)).toBe('Plan')
  })

  it('does not duplicate content when the same offline update is delivered twice', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()

    appendParagraph(alice, 'Only once.')
    applyTextDiff(alice.getText(DOC_TITLE_KEY), 'Once')

    const update = Y.encodeStateAsUpdate(alice)
    Y.applyUpdate(bob, update)
    Y.applyUpdate(bob, update)

    expect(paragraphs(bob)).toEqual(['Only once.'])
    expect(title(bob)).toBe('Once')
  })

  it('converges when offline updates arrive out of order', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()
    const updates: Uint8Array[] = []

    alice.on('update', (update: Uint8Array) => updates.push(update))
    appendParagraph(alice, 'First.')
    paragraphText(alice, 0).insert(6, ' Then more.')
    appendParagraph(alice, 'Second.')

    for (const update of [...updates].reverse()) {
      Y.applyUpdate(bob, update)
    }

    expect(paragraphs(bob)).toEqual(['First. Then more.', 'Second.'])
  })

  it('loses nothing when a third peer was offline for both rounds', () => {
    const alice = new Y.Doc()
    appendParagraph(alice, 'base.')
    const bob = peerFrom(alice)
    const carol = peerFrom(alice)

    appendParagraph(alice, 'alice-1.')
    appendParagraph(bob, 'bob-1.')
    syncBoth(alice, bob)

    appendParagraph(carol, 'carol-1.')
    paragraphText(carol, 0).insert(0, 'carol-edit ')

    syncBoth(alice, carol)
    syncBoth(alice, bob)

    expect(paragraphs(alice)).toEqual(paragraphs(bob))
    expect(paragraphs(bob)).toEqual(paragraphs(carol))

    for (const marker of ['base.', 'alice-1.', 'bob-1.', 'carol-1.', 'carol-edit']) {
      expect(occurrences(paragraphs(carol), marker)).toBe(1)
    }
  })

  it('keeps both sides of concurrent typing at the same position in a paragraph', () => {
    const alice = new Y.Doc()
    appendParagraph(alice, 'AB')
    const bob = peerFrom(alice)

    paragraphText(alice, 0).insert(1, 'alice')
    paragraphText(bob, 0).insert(1, 'bob')

    syncBoth(alice, bob)

    expect(paragraphs(alice)).toEqual(paragraphs(bob))
    expect(paragraphs(alice)[0]).toHaveLength('AB'.length + 'alice'.length + 'bob'.length)
    expect(paragraphs(alice)[0]).toContain('alice')
    expect(paragraphs(alice)[0]).toContain('bob')
  })

  it('applies an offline paragraph deletion and an offline addition from the other peer', () => {
    const alice = new Y.Doc()
    appendParagraph(alice, 'Keep me.')
    appendParagraph(alice, 'Delete me.')
    const bob = peerFrom(alice)

    body(alice).delete(1, 1)
    appendParagraph(bob, 'Added by Bob.')

    syncBoth(alice, bob)

    expect(paragraphs(alice)).toEqual(['Keep me.', 'Added by Bob.'])
    expect(paragraphs(bob)).toEqual(paragraphs(alice))
  })

  it('merges concurrent offline title renames made through the title field', () => {
    const alice = new Y.Doc()
    applyTextDiff(alice.getText(DOC_TITLE_KEY), 'Report')
    const bob = peerFrom(alice)

    applyTextDiff(alice.getText(DOC_TITLE_KEY), 'Report 2026')
    applyTextDiff(bob.getText(DOC_TITLE_KEY), 'Q3 Report')

    syncBoth(alice, bob)

    expect(title(alice)).toBe(title(bob))
    expect(title(alice)).toBe('Q3 Report 2026')
  })
})
