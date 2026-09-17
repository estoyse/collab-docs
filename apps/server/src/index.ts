import { openDatabase, type Db } from './db.js'
import { createDocumentStore } from './documents/store.js'
import { createApp } from './app.js'
import { createCollabServer } from './collab/server.js'
import { parseAllowedOrigins } from './origins.js'

const PORT = Number(process.env.PORT ?? 3001)
const DATABASE_URL = process.env.DATABASE_URL || 'file:data/documents.db'
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || undefined
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CORS_ORIGIN)
const SHUTDOWN_TIMEOUT_MS = 20_000

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection', reason)
})

let db: Db

try {
  db = await openDatabase({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
} catch (error) {
  console.error(`Failed to open the database at ${DATABASE_URL}`, error)
  process.exit(1)
}

const store = createDocumentStore(db)

try {
  await store.backfillExcerpts()
} catch (error) {
  console.error('Failed to backfill document excerpts', error)
}

const collab = createCollabServer({
  store,
  port: PORT,
  app: createApp(store, { allowedOrigins: ALLOWED_ORIGINS }),
  allowedOrigins: ALLOWED_ORIGINS,
})

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

console.log(`collab-docs server listening on port ${collab.address.port}`)

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
