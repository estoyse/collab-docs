import Database from 'better-sqlite3'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applySchema } from './db.js'
import { createApp } from './app.js'
import { createDocumentStore, type DocumentStore } from './documents/store.js'

function createStore(overrides: Partial<DocumentStore> = {}): DocumentStore {
  const db = new Database(':memory:')
  applySchema(db)

  return { ...createDocumentStore(db), ...overrides }
}

describe('app', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports health', async () => {
    const response = await request(createApp(createStore())).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await request(createApp(createStore())).get('/api/nope')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body).toEqual({ error: 'Not found' })
  })

  it('returns a JSON 400 for a malformed JSON body', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(createApp(createStore()))
      .post('/api/documents')
      .set('Content-Type', 'application/json')
      .send('{"title":')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Malformed JSON body' })
    expect(error).not.toHaveBeenCalled()
  })

  it('returns a JSON 500 and logs when a handler throws', async () => {
    const failure = new Error('disk I/O error')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = createStore({
      list: () => {
        throw failure
      },
    })

    const response = await request(createApp(store)).get('/api/documents')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'Internal server error' })
    expect(error).toHaveBeenCalledWith(expect.stringContaining('GET /api/documents'), failure)
  })
})
