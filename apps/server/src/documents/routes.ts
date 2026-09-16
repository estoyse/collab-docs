import { Router } from 'express'
import type { DocumentStore } from './store.js'

const MAX_TITLE_LENGTH = 200

export function createDocumentsRouter(store: DocumentStore): Router {
  const router = Router()

  router.get('/', (_request, response) => {
    response.json(store.list())
  })

  router.get('/:id', (request, response) => {
    const document = store.get(request.params.id)

    if (!document) {
      response.status(404).json({ error: 'Document not found' })
      return
    }

    response.json(document)
  })

  router.post('/', (request, response) => {
    const { title } = request.body ?? {}

    if (title !== undefined && typeof title !== 'string') {
      response.status(400).json({ error: 'title must be a string' })
      return
    }

    if (typeof title === 'string' && title.length > MAX_TITLE_LENGTH) {
      response.status(400).json({ error: 'title is too long' })
      return
    }

    response.status(201).json(store.create(title?.trim() || undefined))
  })

  return router
}
