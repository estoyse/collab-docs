import * as Y from 'yjs'
import type { InStatement, Row, Value } from '@libsql/client'
import { DEFAULT_DOCUMENT_TITLE, type DocumentSummary } from '@collab-docs/shared'
import type { Db } from '../db.js'
import { extractExcerpt } from '../collab/title.js'

export type DocumentStore = {
  list(): Promise<DocumentSummary[]>
  create(): Promise<DocumentSummary>
  get(id: string): Promise<DocumentSummary | null>
  loadState(id: string): Promise<Uint8Array | null>
  saveState(id: string, state: Uint8Array, title: string, excerpt: string): Promise<void>
  backfillExcerpts(): Promise<number>
}

const SUMMARY_COLUMNS = 'id, title, excerpt, updated_at'

function generateId(): string {
  return Math.random().toString(36).slice(2, 12).padEnd(10, '0')
}

function toSummary(row: Row): DocumentSummary {
  return {
    id: String(row.id),
    title: String(row.title),
    excerpt: String(row.excerpt),
    updatedAt: Number(row.updated_at),
  }
}

function toBytes(value: Value | undefined): Uint8Array | null {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
  }

  return null
}

export function createDocumentStore(db: Db): DocumentStore {
  return {
    async list() {
      const { rows } = await db.execute(
        `SELECT ${SUMMARY_COLUMNS} FROM documents ORDER BY updated_at DESC`,
      )

      return rows.map(toSummary)
    },

    async create() {
      const summary: DocumentSummary = {
        id: generateId(),
        title: DEFAULT_DOCUMENT_TITLE,
        excerpt: '',
        updatedAt: Date.now(),
      }

      await db.execute({
        sql: 'INSERT INTO documents (id, title, excerpt, updated_at, state) VALUES (?, ?, ?, ?, NULL)',
        args: [summary.id, summary.title, summary.excerpt, summary.updatedAt],
      })

      return summary
    },

    async get(id) {
      const { rows } = await db.execute({
        sql: `SELECT ${SUMMARY_COLUMNS} FROM documents WHERE id = ?`,
        args: [id],
      })
      const [row] = rows

      return row ? toSummary(row) : null
    },

    async loadState(id) {
      const { rows } = await db.execute({
        sql: 'SELECT state FROM documents WHERE id = ?',
        args: [id],
      })

      return toBytes(rows[0]?.state)
    },

    async saveState(id, state, title, excerpt) {
      await db.execute({
        sql: `
          INSERT INTO documents (id, title, excerpt, updated_at, state)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            excerpt = excluded.excerpt,
            updated_at = excluded.updated_at,
            state = excluded.state
        `,
        args: [id, title, excerpt, Date.now(), state],
      })
    },

    async backfillExcerpts() {
      const { rows } = await db.execute(
        "SELECT id, state FROM documents WHERE excerpt = '' AND state IS NOT NULL",
      )
      const updates: InStatement[] = []

      for (const row of rows) {
        const state = toBytes(row.state)

        if (!state) {
          continue
        }

        const doc = new Y.Doc()
        Y.applyUpdate(doc, state)
        updates.push({
          sql: 'UPDATE documents SET excerpt = ? WHERE id = ?',
          args: [extractExcerpt(doc), String(row.id)],
        })
        doc.destroy()
      }

      if (updates.length > 0) {
        await db.batch(updates, 'write')
      }

      return updates.length
    },
  }
}
