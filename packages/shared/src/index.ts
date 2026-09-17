export type DocumentSummary = {
  id: string
  title: string
  excerpt: string
  updatedAt: number
}

export type PresenceUser = {
  name: string
  color: string
}

export const DOC_BODY_FIELD = 'body'
export const DOC_TITLE_KEY = 'title'
export const DEFAULT_DOCUMENT_TITLE = 'Untitled'
export const MAX_TITLE_LENGTH = 120
export const MAX_EXCERPT_LENGTH = 280
