import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient, type Client } from '@libsql/client'

export type Db = Client

export type DatabaseConfig = {
  url: string
  authToken?: string
}

export async function applySchema(db: Db): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      state BLOB
    )
  `)

  const { rows } = await db.execute('PRAGMA table_info(documents)')

  if (!rows.some((column) => column.name === 'excerpt')) {
    await db.execute("ALTER TABLE documents ADD COLUMN excerpt TEXT NOT NULL DEFAULT ''")
  }
}

export function localDatabasePath(url: string): string | null {
  const [location = ''] = url.split('?')

  if (!location.startsWith('file:') || location === 'file::memory:') {
    return null
  }

  return location.startsWith('file://') ? fileURLToPath(location) : location.slice('file:'.length)
}

export async function openDatabase({ url, authToken }: DatabaseConfig): Promise<Db> {
  const localPath = localDatabasePath(url)

  if (localPath) {
    mkdirSync(dirname(localPath), { recursive: true })
  }

  const db = createClient({ url, authToken })

  try {
    if (localPath) {
      await db.execute('PRAGMA journal_mode = WAL')
    }

    await applySchema(db)
  } catch (error) {
    db.close()
    throw error
  }

  return db
}
