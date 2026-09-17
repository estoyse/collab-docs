import { describe, expect, it } from 'vitest'
import { ORIGIN_NOT_ALLOWED_REASON, assertAllowedOrigin, parseAllowedOrigins } from './origins.js'

describe('parseAllowedOrigins', () => {
  it('splits a comma-separated list, trimming spaces and trailing slashes', () => {
    expect(parseAllowedOrigins(' https://a.example , https://b.example/ ,,')).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('returns an empty list when unset or blank', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([])
    expect(parseAllowedOrigins('  ')).toEqual([])
  })
})

describe('assertAllowedOrigin', () => {
  const allowed = ['https://collab-docs.example.workers.dev']

  it('accepts an origin on the allowlist', () => {
    expect(() => assertAllowedOrigin('https://collab-docs.example.workers.dev', allowed)).not.toThrow()
  })

  it('rejects other or missing origins with the origin-not-allowed reason', () => {
    for (const origin of ['https://evil.example', 'http://collab-docs.example.workers.dev', null]) {
      expect(() => assertAllowedOrigin(origin, allowed)).toThrow(
        expect.objectContaining({ reason: ORIGIN_NOT_ALLOWED_REASON }),
      )
    }
  })

  it('accepts any origin when no allowlist is configured', () => {
    expect(() => assertAllowedOrigin('https://anything.example', [])).not.toThrow()
    expect(() => assertAllowedOrigin(null, [])).not.toThrow()
  })
})
