import { describe, expect, it } from 'vitest'
import { DOC_SCHEMA_VERSION, SCHEMA_VERSION_PARAMETER } from '@collab-docs/shared'
import { withSchemaVersion } from './serverUrl.js'

function versionOf(url: string): string | null {
  return new URL(url, 'http://fallback.test').searchParams.get(SCHEMA_VERSION_PARAMETER)
}

describe('withSchemaVersion', () => {
  it('adds the schema version to a websocket url', () => {
    const url = withSchemaVersion('ws://localhost:3001')

    expect(url.startsWith('ws://localhost:3001')).toBe(true)
    expect(versionOf(url)).toBe(String(DOC_SCHEMA_VERSION))
  })

  it('keeps existing query parameters', () => {
    const url = withSchemaVersion('wss://collab.example.com/sync?region=eu')

    expect(new URL(url).searchParams.get('region')).toBe('eu')
    expect(versionOf(url)).toBe(String(DOC_SCHEMA_VERSION))
  })

  it('replaces a stale schema version instead of duplicating it', () => {
    const url = withSchemaVersion(`ws://localhost:3001/?${SCHEMA_VERSION_PARAMETER}=0`)

    expect(new URL(url).searchParams.getAll(SCHEMA_VERSION_PARAMETER)).toEqual([
      String(DOC_SCHEMA_VERSION),
    ])
  })

  it('appends the version to a url it cannot parse', () => {
    expect(versionOf(withSchemaVersion('/collab'))).toBe(String(DOC_SCHEMA_VERSION))
    expect(versionOf(withSchemaVersion('/collab?a=1'))).toBe(String(DOC_SCHEMA_VERSION))
  })
})
