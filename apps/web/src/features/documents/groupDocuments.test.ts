import { describe, expect, it } from 'vitest'
import type { DocumentSummary } from '@collab-docs/shared'
import { formatUpdatedAt, groupDocuments } from './groupDocuments.js'

function doc(id: string, updatedAt: number): DocumentSummary {
  return { id, title: id, updatedAt }
}

describe('groupDocuments', () => {
  const now = new Date(2024, 5, 15, 12)

  it('buckets documents into Today, Yesterday, Earlier this week and Earlier', () => {
    const today = doc('today', new Date(2024, 5, 15, 9).getTime())
    const yesterday = doc('yesterday', new Date(2024, 5, 14, 9).getTime())
    const earlierThisWeekStart = doc('week-start', new Date(2024, 5, 13, 9).getTime())
    const earlierThisWeekEnd = doc('week-end', new Date(2024, 5, 8, 9).getTime())
    const earlier = doc('earlier', new Date(2024, 5, 7, 9).getTime())

    const groups = groupDocuments(
      [today, yesterday, earlierThisWeekStart, earlierThisWeekEnd, earlier],
      now
    )

    expect(groups).toEqual([
      { label: 'Today', documents: [today] },
      { label: 'Yesterday', documents: [yesterday] },
      { label: 'Earlier this week', documents: [earlierThisWeekStart, earlierThisWeekEnd] },
      { label: 'Earlier', documents: [earlier] },
    ])
  })

  it('omits empty groups', () => {
    const today = doc('today', new Date(2024, 5, 15, 9).getTime())
    const earlier = doc('earlier', new Date(2024, 5, 1, 9).getTime())

    const groups = groupDocuments([today, earlier], now)

    expect(groups.map((group) => group.label)).toEqual(['Today', 'Earlier'])
  })

  it('preserves input order within a group', () => {
    const second = doc('second', new Date(2024, 5, 15, 14).getTime())
    const first = doc('first', new Date(2024, 5, 15, 9).getTime())
    const third = doc('third', new Date(2024, 5, 15, 22).getTime())

    const groups = groupDocuments([second, first, third], now)

    expect(groups).toEqual([{ label: 'Today', documents: [second, first, third] }])
  })

  it('treats midnight boundaries by local calendar day, not elapsed hours', () => {
    const lateLastNight = doc('late-last-night', new Date(2024, 5, 14, 23, 59).getTime())
    const earlyToday = doc('early-today', new Date(2024, 5, 15, 0, 1).getTime())

    const groups = groupDocuments([lateLastNight, earlyToday], now)

    expect(groups).toEqual([
      { label: 'Today', documents: [earlyToday] },
      { label: 'Yesterday', documents: [lateLastNight] },
    ])
  })

  it('returns no groups for an empty document list', () => {
    expect(groupDocuments([], now)).toEqual([])
  })
})

describe('formatUpdatedAt', () => {
  const now = new Date(2024, 5, 15, 12)

  it('formats today as time only, with no month name', () => {
    const result = formatUpdatedAt(new Date(2024, 5, 15, 9, 30).getTime(), now)

    expect(result).not.toMatch(/June|Jun/)
  })

  it('formats yesterday as time only, with no month name', () => {
    const result = formatUpdatedAt(new Date(2024, 5, 14, 9, 30).getTime(), now)

    expect(result).not.toMatch(/June|Jun/)
  })

  it('includes the year when the date is from a different year', () => {
    const result = formatUpdatedAt(new Date(2022, 5, 15, 9, 30).getTime(), now)

    expect(result).toContain('2022')
  })

  it('omits the year when the date is from the same year but not today or yesterday', () => {
    const result = formatUpdatedAt(new Date(2024, 5, 1, 9, 30).getTime(), now)

    expect(result).not.toContain('2024')
  })
})
