import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD, DOC_TITLE_KEY } from '@collab-docs/shared'
import { extractTitle } from './title.js'

function docWithBody(paragraphs: string[]): Y.Doc {
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

  return doc
}

describe('extractTitle', () => {
  it('prefers the collaborative title field', () => {
    const doc = docWithBody(['Body text'])
    doc.getText(DOC_TITLE_KEY).insert(0, 'My title')

    expect(extractTitle(doc)).toBe('My title')
  })

  it('trims the title', () => {
    const doc = new Y.Doc()
    doc.getText(DOC_TITLE_KEY).insert(0, '   Spaced   ')

    expect(extractTitle(doc)).toBe('Spaced')
  })

  it('falls back to the first non-empty body line', () => {
    expect(extractTitle(docWithBody(['', '  ', 'First real line', 'Second']))).toBe(
      'First real line',
    )
  })

  it('falls back to the default when the document is empty', () => {
    expect(extractTitle(new Y.Doc())).toBe('Untitled')
    expect(extractTitle(docWithBody(['', '   ']))).toBe('Untitled')
  })

  it('truncates a very long title', () => {
    const doc = docWithBody(['x'.repeat(500)])

    expect(extractTitle(doc)).toHaveLength(120)
  })
})
