import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ORIGIN_NOT_ALLOWED_REASON } from '../origins.js'
import { createCollabHarness, isSynced, waitFor } from '../test/collabHarness.js'

type AuthOutcome = { kind: 'authenticated' } | { kind: 'failed'; reason: string }

const allowedOrigin = 'https://collab-docs.example.workers.dev'

describe('websocket origin allowlist', { timeout: 15000 }, () => {
  let harness: ReturnType<typeof createCollabHarness>

  beforeEach(() => {
    harness = createCollabHarness()
  })

  afterEach(async () => {
    await harness.cleanup()
  })

  async function outcomeFor(
    allowedOrigins: string[],
    origin: string,
  ): Promise<{ outcome: AuthOutcome; synced: boolean }> {
    const server = await harness.startServer(':memory:', { allowedOrigins })
    let outcome: AuthOutcome | undefined
    const client = harness.connect(server, 'origin-check', {
      origin,
      onAuthenticated: () => {
        outcome = { kind: 'authenticated' }
      },
      onAuthenticationFailed: (reason) => {
        outcome = { kind: 'failed', reason }
      },
    })

    await waitFor(() => outcome !== undefined, 5000, 'authentication outcome')

    if (outcome?.kind === 'authenticated') {
      await waitFor(() => isSynced(client), 5000, 'sync')
    }

    return { outcome: outcome as AuthOutcome, synced: isSynced(client) }
  }

  it('accepts a connection from an allowed origin', async () => {
    const { outcome, synced } = await outcomeFor([allowedOrigin], allowedOrigin)

    expect(outcome).toEqual({ kind: 'authenticated' })
    expect(synced).toBe(true)
  })

  it('rejects a connection from an origin outside the allowlist', async () => {
    const { outcome, synced } = await outcomeFor([allowedOrigin], 'https://evil.example')

    expect(outcome).toEqual({ kind: 'failed', reason: ORIGIN_NOT_ALLOWED_REASON })
    expect(synced).toBe(false)
  })

  it('accepts any origin when no allowlist is configured', async () => {
    const { outcome } = await outcomeFor([], 'https://anything.example')

    expect(outcome).toEqual({ kind: 'authenticated' })
  })
})
