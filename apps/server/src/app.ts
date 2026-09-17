import express, { type ErrorRequestHandler, type RequestHandler } from 'express'
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

function allowCrossOrigin(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins)

  return (request, response, next) => {
    if (allowed.size === 0) {
      next()
      return
    }

    response.vary('Origin')

    const { origin } = request.headers

    if (!origin || !allowed.has(origin)) {
      next()
      return
    }

    response.setHeader('Access-Control-Allow-Origin', origin)

    if (request.method !== 'OPTIONS') {
      next()
      return
    }

    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'content-type')
    response.setHeader('Access-Control-Max-Age', '600')
    response.status(204).end()
  }
}

export type AppOptions = {
  allowedOrigins?: readonly string[]
}

export function createApp(store: DocumentStore, options: AppOptions = {}): express.Express {
  const app = express()

  app.use(allowCrossOrigin(options.allowedOrigins ?? []))
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
