import { DEFAULT_DOCUMENT_TITLE, MAX_TITLE_LENGTH, type DocumentSummary } from '@collab-docs/shared'
import type { Db } from '../db.js'

export type DocumentStore = {
  list(): DocumentSummary[]
  create(title?: string): DocumentSummary
  get(id: string): DocumentSummary | null
  loadState(id: string): Uint8Array | null
  saveState(id: string, state: Uint8Array, title: string): void
}

type DocumentRow = { id: string; title: string; updated_at: number }

function generateId(): string {
  return Math.random().toString(36).slice(2, 12).padEnd(10, '0')
}

function toSummary(row: DocumentRow): DocumentSummary {
  return { id: row.id, title: row.title, updatedAt: row.updated_at }
}

export function createDocumentStore(db: Db): DocumentStore {
  const listStatement = db.prepare(
    'SELECT id, title, updated_at FROM documents ORDER BY updated_at DESC',
  )
  const getStatement = db.prepare(
    'SELECT id, title, updated_at FROM documents WHERE id = ?',
  )
  const insertStatement = db.prepare(
    'INSERT INTO documents (id, title, updated_at, state) VALUES (?, ?, ?, NULL)',
  )
  const loadStateStatement = db.prepare('SELECT state FROM documents WHERE id = ?')
  const saveStateStatement = db.prepare(`
    INSERT INTO documents (id, title, updated_at, state)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      updated_at = excluded.updated_at,
      state = excluded.state
  `)

  return {
    list() {
      return (listStatement.all() as DocumentRow[]).map(toSummary)
    },

    create(title = DEFAULT_DOCUMENT_TITLE) {
      const summary: DocumentSummary = {
        id: generateId(),
        title: title.slice(0, MAX_TITLE_LENGTH),
        updatedAt: Date.now(),
      }

      insertStatement.run(summary.id, summary.title, summary.updatedAt)

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

    saveState(id, state, title) {
      saveStateStatement.run(id, title, Date.now(), Buffer.from(state))
    },
  }
}
