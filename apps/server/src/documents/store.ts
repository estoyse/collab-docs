import * as Y from 'yjs'
import { DEFAULT_DOCUMENT_TITLE, MAX_TITLE_LENGTH, type DocumentSummary } from '@collab-docs/shared'
import type { Db } from '../db.js'
import { extractExcerpt } from '../collab/title.js'

export type DocumentStore = {
  list(): DocumentSummary[]
  create(title?: string): DocumentSummary
  get(id: string): DocumentSummary | null
  loadState(id: string): Uint8Array | null
  saveState(id: string, state: Uint8Array, title: string, excerpt: string): void
  backfillExcerpts(): number
}

type DocumentRow = { id: string; title: string; excerpt: string; updated_at: number }

function generateId(): string {
  return Math.random().toString(36).slice(2, 12).padEnd(10, '0')
}

function toSummary(row: DocumentRow): DocumentSummary {
  return { id: row.id, title: row.title, excerpt: row.excerpt, updatedAt: row.updated_at }
}

export function createDocumentStore(db: Db): DocumentStore {
  const listStatement = db.prepare(
    'SELECT id, title, excerpt, updated_at FROM documents ORDER BY updated_at DESC',
  )
  const getStatement = db.prepare(
    'SELECT id, title, excerpt, updated_at FROM documents WHERE id = ?',
  )
  const insertStatement = db.prepare(
    'INSERT INTO documents (id, title, excerpt, updated_at, state) VALUES (?, ?, ?, ?, NULL)',
  )
  const loadStateStatement = db.prepare('SELECT state FROM documents WHERE id = ?')
  const saveStateStatement = db.prepare(`
    INSERT INTO documents (id, title, excerpt, updated_at, state)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      excerpt = excluded.excerpt,
      updated_at = excluded.updated_at,
      state = excluded.state
  `)
  const backfillCandidatesStatement = db.prepare(
    "SELECT id, state FROM documents WHERE excerpt = '' AND state IS NOT NULL",
  )
  const backfillUpdateStatement = db.prepare(
    'UPDATE documents SET excerpt = ? WHERE id = ?',
  )

  return {
    list() {
      return (listStatement.all() as DocumentRow[]).map(toSummary)
    },

    create(title = DEFAULT_DOCUMENT_TITLE) {
      const summary: DocumentSummary = {
        id: generateId(),
        title: title.slice(0, MAX_TITLE_LENGTH),
        excerpt: '',
        updatedAt: Date.now(),
      }

      insertStatement.run(summary.id, summary.title, summary.excerpt, summary.updatedAt)

      return summary
    },

    get(id) {
      const row = getStatement.get(id) as DocumentRow | undefined

      return row ? toSummary(row) : null
    },

    loadState(id) {
      const row = loadStateStatement.get(id) as { state: Buffer | null } | undefined

      return row?.state ? new Uint8Array(row.state) : null
    },

    saveState(id, state, title, excerpt) {
      saveStateStatement.run(id, title, excerpt, Date.now(), Buffer.from(state))
    },

    backfillExcerpts() {
      const rows = backfillCandidatesStatement.all() as { id: string; state: Buffer }[]

      for (const row of rows) {
        const doc = new Y.Doc()
        Y.applyUpdate(doc, new Uint8Array(row.state))
        backfillUpdateStatement.run(extractExcerpt(doc), row.id)
      }

      return rows.length
    },
  }
}
