import type { DocumentSummary } from '@collab-docs/shared'

const STORAGE_KEY = 'collab-docs:documents'

function isDocumentSummary(value: unknown): value is DocumentSummary {
  const candidate = value as DocumentSummary | null

  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.updatedAt === 'number' &&
    (candidate.excerpt === undefined || typeof candidate.excerpt === 'string')
  )
}

export function loadCachedDocuments(): DocumentSummary[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) && parsed.every(isDocumentSummary) ? parsed : null
  } catch {
    return null
  }
}

export function saveCachedDocuments(documents: DocumentSummary[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
  } catch {
    return
  }
}
