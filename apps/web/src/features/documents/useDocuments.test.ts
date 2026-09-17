import { describe, expect, it } from 'vitest'
import { describeLoadFailure } from './useDocuments.js'

describe('describeLoadFailure', () => {
  it('says the saved list is shown when the server is unreachable', () => {
    expect(describeLoadFailure(new TypeError('Failed to fetch'), true)).toBe(
      'Could not reach the server. Showing the last list saved on this device. Reconnect to refresh.',
    )
  })

  it('does not claim a saved list exists when none does', () => {
    expect(describeLoadFailure(new TypeError('Failed to fetch'), false)).not.toContain('saved')
  })

  it('includes the status code for server errors', () => {
    const error = Object.assign(new Error('Request failed with 500'), { status: 500 })

    expect(describeLoadFailure(error, true)).toContain('(500)')
    expect(describeLoadFailure(error, true)).toContain('last list saved on this device')
    expect(describeLoadFailure(error, false)).toContain('(500)')
  })
})
