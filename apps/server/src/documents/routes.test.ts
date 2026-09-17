import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../db.js'
import { createDocumentStore } from './store.js'
import { createDocumentsRouter } from './routes.js'

async function createApp() {
  const db = await openDatabase({ url: ':memory:' })
  const app = express()
  app.use(express.json())
  app.use('/api/documents', createDocumentsRouter(createDocumentStore(db)))

  return app
}

describe('documents API', () => {
  let app: express.Express

  beforeEach(async () => {
    app = await createApp()
  })

  it('returns an empty list initially', async () => {
    const response = await request(app).get('/api/documents')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('creates a document and returns it in the list', async () => {
    const created = await request(app).post('/api/documents').send({})

    expect(created.status).toBe(201)
    expect(created.body.title).toBe('Untitled')
    expect(created.body.excerpt).toBe('')

    const listed = await request(app).get('/api/documents')

    expect(listed.body).toHaveLength(1)
    expect(listed.body[0].id).toBe(created.body.id)
    expect(listed.body[0].excerpt).toBe('')
  })

  it('always defaults the title, since nothing sends one', async () => {
    const created = await request(app).post('/api/documents').send({})

    expect(created.body.title).toBe('Untitled')
  })

  it('ignores a title field in the request body', async () => {
    const response = await request(app).post('/api/documents').send({ title: 42 })

    expect(response.status).toBe(201)
    expect(response.body.title).toBe('Untitled')
  })

  it('404s an unknown document', async () => {
    const response = await request(app).get('/api/documents/missing')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Document not found' })
  })

  it('400s a malformed document id', async () => {
    const tooLong = await request(app).get(`/api/documents/${'a'.repeat(65)}`)
    const badCharacters = await request(app).get('/api/documents/has%20space')

    expect(tooLong.status).toBe(400)
    expect(tooLong.body).toEqual({ error: 'Invalid document id' })
    expect(badCharacters.status).toBe(400)
    expect(badCharacters.body).toEqual({ error: 'Invalid document id' })
  })
})
