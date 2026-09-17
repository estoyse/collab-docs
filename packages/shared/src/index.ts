export type DocumentSummary = {
  id: string
  title: string
  excerpt: string
  updatedAt: number
}

export const DOC_BODY_FIELD = 'body'
export const DOC_TITLE_KEY = 'title'
export const DEFAULT_DOCUMENT_TITLE = 'Untitled'
export const MAX_TITLE_LENGTH = 120

export const DOC_SCHEMA_VERSION = 1
export const SCHEMA_VERSION_PARAMETER = 'schemaVersion'
export const SCHEMA_MISMATCH_REASON = 'schema-mismatch'

export function resolveDocumentTitle(title: string, firstBodyLine: string): string {
  const candidate = title.trim() || firstBodyLine.trim() || DEFAULT_DOCUMENT_TITLE

  return candidate.slice(0, MAX_TITLE_LENGTH)
}
