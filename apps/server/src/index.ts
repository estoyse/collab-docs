import express from 'express'
import { openDatabase } from './db.js'
import { createDocumentStore } from './documents/store.js'
import { createDocumentsRouter } from './documents/routes.js'
import { createCollabServer } from './collab/server.js'

const PORT = Number(process.env.PORT ?? 3001)
const DATABASE_PATH = process.env.DATABASE_PATH ?? 'data/documents.db'

const db = openDatabase(DATABASE_PATH)
const store = createDocumentStore(db)
store.backfillExcerpts()

const app = express()
app.use(express.json())
app.get('/api/health', (_request, response) => response.json({ ok: true }))
app.use('/api/documents', createDocumentsRouter(store))

const collab = createCollabServer({ store, port: PORT, app })

await collab.listen()
console.log(`collab-docs server listening on http://localhost:${PORT}`)

const SHUTDOWN_TIMEOUT_MS = 5000

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.log(`\n${signal} received, flushing documents`)

  const forceExit = setTimeout(() => {
    console.error('Shutdown timed out, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  collab.hocuspocus.flushPendingStores()
  await collab.destroy()
  db.close()

  clearTimeout(forceExit)
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
