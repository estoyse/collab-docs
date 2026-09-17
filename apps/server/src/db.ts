import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

export type Db = Database.Database

export function applySchema(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      state BLOB
    )
  `)

  const columns = db.prepare('PRAGMA table_info(documents)').all() as { name: string }[]

  if (!columns.some((column) => column.name === 'excerpt')) {
    db.exec("ALTER TABLE documents ADD COLUMN excerpt TEXT NOT NULL DEFAULT ''")
  }
}

export function openDatabase(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }

  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  applySchema(db)

  return db
}
