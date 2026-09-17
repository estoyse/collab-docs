import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { DOC_BODY_FIELD, DOC_TITLE_KEY, MAX_EXCERPT_LENGTH } from '@collab-docs/shared'
import { extractExcerpt, extractTitle } from './title.js'

function textElement(name: string, text: string): Y.XmlElement {
  const element = new Y.XmlElement(name)
  element.insert(0, [new Y.XmlText(text)])
  return element
}

function docWithBody(paragraphs: string[]): Y.Doc {
  const doc = new Y.Doc()
  const fragment = doc.getXmlFragment(DOC_BODY_FIELD)

  fragment.insert(
    0,
    paragraphs.map((text) => textElement('paragraph', text)),
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

function listItem(text: string): Y.XmlElement {
  const item = new Y.XmlElement('listItem')
  item.insert(0, [textElement('paragraph', text)])
  return item
}

function bulletList(items: Y.XmlElement[]): Y.XmlElement {
  const list = new Y.XmlElement('bulletList')
  list.insert(0, items)
  return list
}

describe('extractExcerpt', () => {
  it('turns each paragraph, heading and list item into its own line', () => {
    const doc = new Y.Doc()
    doc.getText(DOC_TITLE_KEY).insert(0, 'Title')
    doc.getXmlFragment(DOC_BODY_FIELD).insert(0, [
      textElement('heading', 'Heading'),
      textElement('paragraph', 'First paragraph'),
      bulletList([listItem('Item one'), listItem('Item two')]),
    ])

    expect(extractExcerpt(doc)).toBe('Heading\nFirst paragraph\nItem one\nItem two')
  })

  it('drops the first line when the title is blank, since it became the title', () => {
    const doc = docWithBody(['First line', 'Second line'])

    expect(extractExcerpt(doc)).toBe('Second line')
  })

  it('keeps every line when the title is not blank', () => {
    const doc = docWithBody(['First line', 'Second line'])
    doc.getText(DOC_TITLE_KEY).insert(0, 'My title')

    expect(extractExcerpt(doc)).toBe('First line\nSecond line')
  })

  it('truncates to MAX_EXCERPT_LENGTH characters', () => {
    const doc = docWithBody(['x'.repeat(500)])
    doc.getText(DOC_TITLE_KEY).insert(0, 'Title')

    expect(extractExcerpt(doc)).toHaveLength(MAX_EXCERPT_LENGTH)
  })

  it('returns an empty string for an empty document', () => {
    expect(extractExcerpt(new Y.Doc())).toBe('')
    expect(extractExcerpt(docWithBody(['', '   ']))).toBe('')
  })
})
