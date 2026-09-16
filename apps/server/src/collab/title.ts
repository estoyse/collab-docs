import * as Y from 'yjs'
import { DEFAULT_DOCUMENT_TITLE, DOC_BODY_FIELD, DOC_TITLE_KEY } from '@collab-docs/shared'

const MAX_TITLE_LENGTH = 120

type XmlNode = Y.XmlElement | Y.XmlText | Y.XmlHook

function nodeText(node: XmlNode): string {
  if (node instanceof Y.XmlText) {
    return node
      .toDelta()
      .map((operation: { insert?: unknown }) =>
        typeof operation.insert === 'string' ? operation.insert : '',
      )
      .join('')
  }

  if (node instanceof Y.XmlElement) {
    return node.toArray().map(nodeText).join('')
  }

  return ''
}

function firstBodyLine(doc: Y.Doc): string {
  for (const node of doc.getXmlFragment(DOC_BODY_FIELD).toArray()) {
    const text = nodeText(node).trim()

    if (text) {
      return text
    }
  }

  return ''
}

export function extractTitle(doc: Y.Doc): string {
  const candidate = doc.getText(DOC_TITLE_KEY).toString().trim() || firstBodyLine(doc)

  return (candidate || DEFAULT_DOCUMENT_TITLE).slice(0, MAX_TITLE_LENGTH)
}
