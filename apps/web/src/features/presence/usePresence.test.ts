import { describe, expect, it } from 'vitest'
import { presenceEntries } from './usePresence.js'

const alice = { name: 'Alice', color: '#aa0000' }
const bob = { name: 'Bob', color: '#0000bb' }

describe('presenceEntries', () => {
  it('returns one entry per awareness client, even when names repeat', () => {
    const entries = presenceEntries(
      new Map([
        [30, { user: alice }],
        [10, { user: alice }],
        [20, { user: bob }],
      ]),
      10,
    )

    expect(entries.map((entry) => entry.clientId)).toEqual([10, 20, 30])
    expect(entries.filter((entry) => entry.name === 'Alice')).toHaveLength(2)
  })

  it('marks only the local client as self and lists it first', () => {
    const entries = presenceEntries(
      new Map([
        [5, { user: bob }],
        [9, { user: alice }],
        [7, { user: alice }],
      ]),
      9,
    )

    expect(entries.map((entry) => [entry.clientId, entry.isSelf])).toEqual([
      [9, true],
      [5, false],
      [7, false],
    ])
  })

  it('skips clients without a valid user', () => {
    const entries = presenceEntries(
      new Map<number, Record<string, unknown>>([
        [1, {}],
        [2, { user: { name: 'No colour' } }],
        [3, { user: 'Alice' }],
        [4, { user: bob }],
      ]),
      1,
    )

    expect(entries).toEqual([{ clientId: 4, name: 'Bob', color: '#0000bb', isSelf: false }])
  })
})
