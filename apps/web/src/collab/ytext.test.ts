import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { applyTextDiff, mapIndexThroughDelta, spliceBetween, type TextDeltaOp } from './ytext.js'

function ytextWith(value: string): Y.Text {
  const doc = new Y.Doc()
  const text = doc.getText('title')
  text.insert(0, value)

  return text
}

describe('applyTextDiff', () => {
  it('does nothing when the value is unchanged', () => {
    const text = ytextWith('Report')
    applyTextDiff(text, 'Report')

    expect(text.toString()).toBe('Report')
  })

  it('appends', () => {
    const text = ytextWith('Report')
    applyTextDiff(text, 'Report 2026')

    expect(text.toString()).toBe('Report 2026')
  })

  it('prepends', () => {
    const text = ytextWith('Report')
    applyTextDiff(text, 'Draft Report')

    expect(text.toString()).toBe('Draft Report')
  })

  it('replaces in the middle', () => {
    const text = ytextWith('Q1 report draft')
    applyTextDiff(text, 'Q3 report draft')

    expect(text.toString()).toBe('Q3 report draft')
  })

  it('clears', () => {
    const text = ytextWith('Report')
    applyTextDiff(text, '')

    expect(text.toString()).toBe('')
  })

  it('touches only the changed span, so concurrent renames merge', () => {
    const alice = new Y.Doc()
    const bob = new Y.Doc()

    alice.getText('title').insert(0, 'Report')
    Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice))

    applyTextDiff(alice.getText('title'), 'Report 2026')
    applyTextDiff(bob.getText('title'), 'Draft Report')

    Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice, Y.encodeStateVector(bob)))
    Y.applyUpdate(alice, Y.encodeStateAsUpdate(bob, Y.encodeStateVector(alice)))

    expect(alice.getText('title').toString()).toBe(bob.getText('title').toString())
    expect(alice.getText('title').toString()).toBe('Draft Report 2026')
    expect(alice.getText('title').toString()).toContain('Report')
  })
})

function peers(initial: string) {
  const alice = new Y.Doc()
  const bob = new Y.Doc()
  alice.getText('title').insert(0, initial)
  Y.applyUpdate(bob, Y.encodeStateAsUpdate(alice))

  return { alice, bob }
}

function deliver(from: Y.Doc, to: Y.Doc): void {
  Y.applyUpdate(to, Y.encodeStateAsUpdate(from, Y.encodeStateVector(to)))
}

describe('applyTextDiff against a stale displayed value', () => {
  it('keeps a remote edit that landed before the local keystroke was applied', () => {
    const { alice, bob } = peers('Report')
    const displayed = bob.getText('title').toString()

    applyTextDiff(alice.getText('title'), 'Draft Report')
    deliver(alice, bob)

    applyTextDiff(bob.getText('title'), 'Report!', displayed)

    expect(bob.getText('title').toString()).toBe('Draft Report!')
  })

  it('keeps a remote edit after the local change', () => {
    const { alice, bob } = peers('Q3 report')
    const displayed = 'Q3 report'

    applyTextDiff(alice.getText('title'), 'Q3 report 2026')
    deliver(alice, bob)

    applyTextDiff(bob.getText('title'), 'Q4 report', displayed)

    expect(bob.getText('title').toString()).toBe('Q4 report 2026')
  })

  it('does not delete remote text inside a range the local user deleted', () => {
    const { alice, bob } = peers('one two three')
    const displayed = 'one two three'

    applyTextDiff(alice.getText('title'), 'one TWO three')
    deliver(alice, bob)

    applyTextDiff(bob.getText('title'), 'one three', displayed)

    expect(bob.getText('title').toString()).toContain('TWO')
    expect(bob.getText('title').toString()).not.toContain('two')
  })

  it('behaves like a plain diff when nothing changed remotely', () => {
    const { bob } = peers('Report')

    applyTextDiff(bob.getText('title'), 'Reports', 'Report')

    expect(bob.getText('title').toString()).toBe('Reports')
  })

  it('converges with the peer after rebasing', () => {
    const { alice, bob } = peers('Report')
    const displayed = 'Report'

    applyTextDiff(alice.getText('title'), 'Final Report')
    deliver(alice, bob)
    applyTextDiff(bob.getText('title'), 'Repo', displayed)
    deliver(bob, alice)

    expect(alice.getText('title').toString()).toBe(bob.getText('title').toString())
    expect(alice.getText('title').toString()).toBe('Final Repo')
  })
})

describe('spliceBetween', () => {
  it('returns null for equal strings', () => {
    expect(spliceBetween('same', 'same')).toBeNull()
  })

  it('describes the changed span', () => {
    expect(spliceBetween('Q1 report', 'Q3 report')).toEqual({ start: 1, end: 2, text: '3' })
  })
})

describe('mapIndexThroughDelta', () => {
  function deltaOf(initial: string, change: (text: Y.Text) => void) {
    const doc = new Y.Doc()
    const text = doc.getText('title')
    text.insert(0, initial)

    let delta: TextDeltaOp[] = []
    text.observe((event) => {
      delta = event.delta as TextDeltaOp[]
    })
    change(text)

    return delta
  }

  it('shifts the caret right when text is inserted before it', () => {
    const delta = deltaOf('Report', (text) => text.insert(0, 'Draft '))

    expect(mapIndexThroughDelta(3, delta)).toBe(9)
  })

  it('keeps the caret when text is inserted after it', () => {
    const delta = deltaOf('Report', (text) => text.insert(6, ' 2026'))

    expect(mapIndexThroughDelta(3, delta)).toBe(3)
  })

  it('shifts the caret left when text before it is deleted', () => {
    const delta = deltaOf('Draft Report', (text) => text.delete(0, 6))

    expect(mapIndexThroughDelta(9, delta)).toBe(3)
  })

  it('moves the caret to the start of a deletion that contained it', () => {
    const delta = deltaOf('Draft Report', (text) => text.delete(2, 6))

    expect(mapIndexThroughDelta(4, delta)).toBe(2)
  })

  it('keeps the caret before text inserted exactly at it', () => {
    const delta = deltaOf('Report', (text) => text.insert(3, 'XX'))

    expect(mapIndexThroughDelta(3, delta)).toBe(3)
  })

  it('handles a remote replacement before the caret', () => {
    const delta = deltaOf('Q1 report draft', (text) => {
      text.doc!.transact(() => {
        text.delete(0, 2)
        text.insert(0, 'Quarter 3')
      })
    })

    expect(mapIndexThroughDelta(9, delta)).toBe(16)
  })
})
