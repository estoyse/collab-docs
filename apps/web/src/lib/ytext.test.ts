import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { applyTextDiff } from './ytext.js'

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
