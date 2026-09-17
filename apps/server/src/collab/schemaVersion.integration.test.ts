import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SCHEMA_MISMATCH_REASON } from '@collab-docs/shared'
import {
  createCollabHarness,
  isSynced,
  waitFor,
  type RunningServer,
} from '../test/collabHarness.js'

type AuthOutcome = { kind: 'authenticated' } | { kind: 'failed'; reason: string }

describe('schema version gate', { timeout: 15000 }, () => {
  let harness: ReturnType<typeof createCollabHarness>
  let server: RunningServer

  beforeEach(async () => {
    harness = createCollabHarness()
    server = await harness.startServer()
  })

  afterEach(async () => {
    await harness.cleanup()
  })

  it('accepts a client that sends the current schema version', async () => {
    let outcome: AuthOutcome | undefined
    const client = harness.connect(server, 'schema-current', {
      onAuthenticated: () => {
        outcome = { kind: 'authenticated' }
      },
      onAuthenticationFailed: (reason) => {
        outcome = { kind: 'failed', reason }
      },
    })

    await waitFor(() => outcome !== undefined && isSynced(client), 5000, 'authentication')

    expect(outcome).toEqual({ kind: 'authenticated' })
  })

  it('rejects a client that omits the schema version [requires server schema check]', async () => {
    let outcome: AuthOutcome | undefined
    harness.connect(server, 'schema-missing', {
      sendSchemaVersion: false,
      onAuthenticated: () => {
        outcome = { kind: 'authenticated' }
      },
      onAuthenticationFailed: (reason) => {
        outcome = { kind: 'failed', reason }
      },
    })

    await waitFor(() => outcome !== undefined, 5000, 'authentication outcome')

    expect(outcome).toEqual({ kind: 'failed', reason: SCHEMA_MISMATCH_REASON })
  })
})
