import * as Y from 'yjs'
import {
  DOC_BODY_FIELD,
  DOC_TITLE_KEY,
  resolveDocumentTitle,
} from '@collab-docs/shared'

export const MAX_EXCERPT_LENGTH = 280

type XmlNode = Y.XmlElement | Y.XmlText | Y.XmlHook
type XmlContainer = Y.XmlFragment | Y.XmlElement

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

function isLeafTextBlock(element: Y.XmlElement): boolean {
  return element.toArray().some((child) => child instanceof Y.XmlText)
}

function collectBlockLines(container: XmlContainer, lines: string[]): void {
  for (const child of container.toArray()) {
    if (!(child instanceof Y.XmlElement)) {
      continue
    }

    if (isLeafTextBlock(child)) {
      lines.push(nodeText(child))
    } else {
      collectBlockLines(child, lines)
    }
  }
}

function bodyLines(doc: Y.Doc): string[] {
  const lines: string[] = []
  collectBlockLines(doc.getXmlFragment(DOC_BODY_FIELD), lines)

  return lines
}

function firstBodyLine(doc: Y.Doc): string {
  for (const line of bodyLines(doc)) {
    const text = line.trim()

    if (text) {
      return text
    }
  }

  return ''
}

export function extractTitle(doc: Y.Doc): string {
  return resolveDocumentTitle(doc.getText(DOC_TITLE_KEY).toString(), firstBodyLine(doc))
}

export function extractExcerpt(doc: Y.Doc): string {
  const lines = bodyLines(doc)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const titleIsBlank = !doc.getText(DOC_TITLE_KEY).toString().trim()

  if (titleIsBlank && lines.length > 0) {
    lines.shift()
  }

  return lines.join('\n').slice(0, MAX_EXCERPT_LENGTH).trimEnd()
}
