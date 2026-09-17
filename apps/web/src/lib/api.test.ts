import { describe, expect, it } from 'vitest'
import { createApiUrl, resolveCollabUrl } from './api.js'

describe('createApiUrl', () => {
  it('keeps paths relative when no base is configured', () => {
    expect(createApiUrl(undefined)('/api/documents')).toBe('/api/documents')
    expect(createApiUrl('')('/api/documents')).toBe('/api/documents')
    expect(createApiUrl('   ')('/api/documents')).toBe('/api/documents')
  })

  it('prefixes the configured base', () => {
    expect(createApiUrl('https://collab.koyeb.app')('/api/documents')).toBe(
      'https://collab.koyeb.app/api/documents',
    )
  })

  it('drops trailing slashes from the base', () => {
    expect(createApiUrl('https://collab.koyeb.app/')('/api/documents')).toBe(
      'https://collab.koyeb.app/api/documents',
    )
    expect(createApiUrl('https://collab.koyeb.app///')('/api/documents/abc')).toBe(
      'https://collab.koyeb.app/api/documents/abc',
    )
  })

  it('adds a leading slash to the path when missing', () => {
    expect(createApiUrl('https://collab.koyeb.app')('api/documents')).toBe(
      'https://collab.koyeb.app/api/documents',
    )
    expect(createApiUrl(undefined)('api/documents')).toBe('/api/documents')
  })
})

describe('resolveCollabUrl', () => {
  it('prefers an explicit collab url', () => {
    expect(
      resolveCollabUrl({
        VITE_API_URL: 'https://collab.koyeb.app',
        VITE_COLLAB_URL: 'wss://sync.example.com',
      }),
    ).toBe('wss://sync.example.com')
  })

  it('derives a secure websocket url from an https api url', () => {
    expect(resolveCollabUrl({ VITE_API_URL: 'https://collab.koyeb.app/' })).toBe(
      'wss://collab.koyeb.app',
    )
  })

  it('derives a plain websocket url from an http api url and keeps the port', () => {
    expect(resolveCollabUrl({ VITE_API_URL: 'http://localhost:4000' })).toBe('ws://localhost:4000')
  })

  it('ignores any path on the api url', () => {
    expect(resolveCollabUrl({ VITE_API_URL: 'https://collab.koyeb.app/base/' })).toBe(
      'wss://collab.koyeb.app',
    )
  })

  it('falls back to the local server when nothing usable is configured', () => {
    expect(resolveCollabUrl({})).toBe('ws://localhost:3001')
    expect(resolveCollabUrl({ VITE_API_URL: '', VITE_COLLAB_URL: ' ' })).toBe('ws://localhost:3001')
    expect(resolveCollabUrl({ VITE_API_URL: '/relative' })).toBe('ws://localhost:3001')
    expect(resolveCollabUrl({ VITE_API_URL: 'ftp://files.example.com' })).toBe(
      'ws://localhost:3001',
    )
  })
})
