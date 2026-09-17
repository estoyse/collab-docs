import express, { type ErrorRequestHandler } from 'express'
import type { DocumentStore } from './documents/store.js'
import { createDocumentsRouter } from './documents/routes.js'

function isMalformedJsonError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  )
}

const handleErrors: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }

  if (isMalformedJsonError(error)) {
    response.status(400).json({ error: 'Malformed JSON body' })
    return
  }

  console.error(`Request ${request.method} ${request.originalUrl} failed`, error)
  response.status(500).json({ error: 'Internal server error' })
}

export function createApp(store: DocumentStore): express.Express {
  const app = express()

  app.use(express.json())
  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })
  app.use('/api/documents', createDocumentsRouter(store))
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not found' })
  })
  app.use(handleErrors)

  return app
}
