import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'

function sync(from: Y.Doc, to: Y.Doc): void {
  const update = Y.encodeStateAsUpdate(from, Y.encodeStateVector(to))
  Y.applyUpdate(to, update)
}

function syncBoth(a: Y.Doc, b: Y.Doc): void {
  sync(a, b)
  sync(b, a)
}

function text(doc: Y.Doc): string {
  return doc.getText('body').toString()
}

describe('offline merge', () => {
  it('converges after both sides edit while disconnected', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()

    alice.getText('body').insert(0, 'Shared opening. ')
    syncBoth(alice, bob)
    expect(text(bob)).toBe('Shared opening. ')

    alice.getText('body').insert(0, 'ALICE OFFLINE. ')
    bob.getText('body').insert(bob.getText('body').length, 'BOB OFFLINE.')

    expect(text(alice)).not.toBe(text(bob))

    syncBoth(alice, bob)

    expect(text(alice)).toBe(text(bob))
    expect(text(alice)).toContain('ALICE OFFLINE.')
    expect(text(alice)).toContain('BOB OFFLINE.')
    expect(text(alice)).toContain('Shared opening.')
  })

  it('does not duplicate content when the same update is applied twice', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()

    alice.getText('body').insert(0, 'Only once.')

    const update = Y.encodeStateAsUpdate(alice)
    Y.applyUpdate(bob, update)
    Y.applyUpdate(bob, update)

    expect(text(bob)).toBe('Only once.')
  })

  it('loses nothing when a third participant was offline for both rounds', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()
    const carol = new Y.Doc()

    alice.getText('body').insert(0, 'base. ')
    syncBoth(alice, bob)
    syncBoth(alice, carol)

    alice.getText('body').insert(alice.getText('body').length, 'alice-1. ')
    bob.getText('body').insert(bob.getText('body').length, 'bob-1. ')
    syncBoth(alice, bob)

    carol.getText('body').insert(carol.getText('body').length, 'carol-1. ')

    syncBoth(alice, carol)
    syncBoth(alice, bob)

    expect(text(alice)).toBe(text(bob))
    expect(text(bob)).toBe(text(carol))

    for (const marker of ['base.', 'alice-1.', 'bob-1.', 'carol-1.']) {
      expect(text(carol)).toContain(marker)
    }
  })

  it('converges on concurrent edits at the same position', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()

    alice.getText('body').insert(0, 'AB')
    syncBoth(alice, bob)

    alice.getText('body').insert(1, 'alice')
    bob.getText('body').insert(1, 'bob')

    syncBoth(alice, bob)

    expect(text(alice)).toBe(text(bob))
    expect(text(alice)).toHaveLength('AB'.length + 'alice'.length + 'bob'.length)
  })

  it('merges concurrent edits to the collaborative title', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()

    alice.getText('title').insert(0, 'Q3 ')
    syncBoth(alice, bob)

    alice.getText('title').insert(alice.getText('title').length, 'Report')
    bob.getText('title').insert(0, 'Draft ')

    syncBoth(alice, bob)

    expect(alice.getText('title').toString()).toBe(bob.getText('title').toString())
  })
})
