import { Router } from 'express'
import type { DocumentStore } from './store.js'

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

  router.post('/', (_request, response) => {
    response.status(201).json(store.create())
  })

  return router
}
