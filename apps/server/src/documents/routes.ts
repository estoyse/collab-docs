import { Router } from 'express'
import { DOCUMENT_ID_PATTERN } from './documentId.js'
import type { DocumentStore } from './store.js'

export function createDocumentsRouter(store: DocumentStore): Router {
  const router = Router()

  router.get('/', (_request, response) => {
    response.json(store.list())
  })

  router.get('/:id', (request, response) => {
    const { id } = request.params

    if (!DOCUMENT_ID_PATTERN.test(id)) {
      response.status(400).json({ error: 'Invalid document id' })
      return
    }

    const document = store.get(id)

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
