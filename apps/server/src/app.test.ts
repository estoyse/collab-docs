import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openDatabase } from './db.js'
import { createApp } from './app.js'
import { createDocumentStore, type DocumentStore } from './documents/store.js'

async function createStore(overrides: Partial<DocumentStore> = {}): Promise<DocumentStore> {
  const db = await openDatabase({ url: ':memory:' })

  return { ...createDocumentStore(db), ...overrides }
}

describe('app', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports health', async () => {
    const response = await request(createApp(await createStore())).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it('returns a JSON 404 for unknown API routes', async () => {
    const response = await request(createApp(await createStore())).get('/api/nope')

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toMatch(/application\/json/)
    expect(response.body).toEqual({ error: 'Not found' })
  })

  it('returns a JSON 400 for a malformed JSON body', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(createApp(await createStore()))
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
    const store = await createStore({
      list: async () => {
        throw failure
      },
    })

    const response = await request(createApp(store)).get('/api/documents')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'Internal server error' })
    expect(error).toHaveBeenCalledWith(expect.stringContaining('GET /api/documents'), failure)
  })

  describe('cross-origin requests', () => {
    const allowedOrigin = 'https://collab-docs.example.workers.dev'

    it('answers a preflight from an allowed origin with 204 and the CORS headers', async () => {
      const app = createApp(await createStore(), { allowedOrigins: [allowedOrigin] })

      const response = await request(app)
        .options('/api/documents')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type')

      expect(response.status).toBe(204)
      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
      expect(response.headers['access-control-allow-methods']).toBe('GET,POST,OPTIONS')
      expect(response.headers['access-control-allow-headers']).toBe('content-type')
      expect(response.headers.vary).toMatch(/Origin/)
    })

    it('echoes an allowed origin on regular requests', async () => {
      const app = createApp(await createStore(), { allowedOrigins: [allowedOrigin] })

      const response = await request(app).post('/api/documents').set('Origin', allowedOrigin)

      expect(response.status).toBe(201)
      expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin)
      expect(response.headers.vary).toMatch(/Origin/)
    })

    it('grants nothing to an origin outside the allowlist', async () => {
      const app = createApp(await createStore(), { allowedOrigins: [allowedOrigin] })

      const preflight = await request(app)
        .options('/api/documents')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST')
      const listed = await request(app).get('/api/documents').set('Origin', 'https://evil.example')

      expect(preflight.headers['access-control-allow-origin']).toBeUndefined()
      expect(listed.status).toBe(200)
      expect(listed.headers['access-control-allow-origin']).toBeUndefined()
      expect(listed.headers.vary).toMatch(/Origin/)
    })

    it('grants nothing cross-origin when no allowlist is configured', async () => {
      const app = createApp(await createStore())

      const preflight = await request(app)
        .options('/api/documents')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'POST')
      const sameOrigin = await request(app).get('/api/health')

      expect(preflight.headers['access-control-allow-origin']).toBeUndefined()
      expect(sameOrigin.status).toBe(200)
      expect(sameOrigin.headers['access-control-allow-origin']).toBeUndefined()
    })
  })
})
