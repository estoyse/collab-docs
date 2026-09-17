import Database from 'better-sqlite3'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { applySchema } from '../db.js'
import { createDocumentStore } from './store.js'
import { createDocumentsRouter } from './routes.js'

function createApp() {
  const db = new Database(':memory:')
  applySchema(db)
  const app = express()
  app.use(express.json())
  app.use('/api/documents', createDocumentsRouter(createDocumentStore(db)))

  return app
}

describe('documents API', () => {
  let app: express.Express

  beforeEach(() => {
    app = createApp()
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
  })
})
