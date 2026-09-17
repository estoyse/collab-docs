import { openDatabase } from './db.js'
import { createDocumentStore } from './documents/store.js'
import { createApp } from './app.js'
import { createCollabServer } from './collab/server.js'

const PORT = Number(process.env.PORT ?? 3001)
const DATABASE_PATH = process.env.DATABASE_PATH ?? 'data/documents.db'
const SHUTDOWN_TIMEOUT_MS = 5000

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection', reason)
})

const db = openDatabase(DATABASE_PATH)
const store = createDocumentStore(db)
store.backfillExcerpts()

const collab = createCollabServer({ store, port: PORT, app: createApp(store) })

function describeListenError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null

  if (code === 'EADDRINUSE') {
    return `Port ${PORT} is already in use. Set PORT to use another port.`
  }

  if (code === 'EACCES') {
    return `Permission denied to listen on port ${PORT}. Set PORT to use another port.`
  }

  return `Failed to start the server on port ${PORT}: ${error instanceof Error ? error.message : String(error)}`
}

function listen(): Promise<void> {
  return new Promise((resolve, reject) => {
    collab.httpServer.once('error', reject)
    collab.listen().then(() => {
      collab.httpServer.off('error', reject)
      resolve()
    }, reject)
  })
}

try {
  await listen()
} catch (error) {
  console.error(describeListenError(error))
  db.close()
  process.exit(1)
}

console.log(`collab-docs server listening on http://localhost:${PORT}`)

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.log(`\n${signal} received, flushing documents`)

  const forceExit = setTimeout(() => {
    const unsaved = collab.hocuspocus.getDocumentsCount()
    console.error(`Shutdown timed out with ${unsaved} document(s) not yet stored, forcing exit`)
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)

  let exitCode = 0

  try {
    collab.hocuspocus.flushPendingStores()
    await collab.destroy()
  } catch (error) {
    console.error('Failed to flush documents during shutdown', error)
    exitCode = 1
  }

  try {
    db.close()
  } catch (error) {
    console.error('Failed to close the database', error)
    exitCode = 1
  }

  clearTimeout(forceExit)
  process.exit(exitCode)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
