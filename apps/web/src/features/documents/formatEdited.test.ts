import { describe, expect, it } from 'vitest'
import { formatEdited } from './formatEdited'

const now = new Date(2026, 8, 17, 15, 30)

function at(...parts: [number, number, number, number, number]): number {
  return new Date(...parts).getTime()
}

describe('formatEdited', () => {
  it('says just now inside the first minute', () => {
    expect(formatEdited(now.getTime() - 20_000, now)).toBe('Edited just now')
  })

  it('counts minutes and hours on the same day', () => {
    expect(formatEdited(now.getTime() - 12 * 60_000, now)).toMatch(/^Edited .*12/)
    expect(formatEdited(at(2026, 8, 17, 12, 0), now)).toMatch(/^Edited .*3/)
  })

  it('switches to calendar days across midnight once past the hour', () => {
    const lateLastNight = at(2026, 8, 16, 21, 50)
    const earlyThisMorning = new Date(2026, 8, 17, 0, 20)

    expect(formatEdited(lateLastNight, earlyThisMorning)).not.toMatch(/minute|hour/)
    expect(formatEdited(at(2026, 8, 14, 9, 0), now)).toMatch(/^Edited .*3/)
  })

  it('falls back to a date after a week, with the year only when it differs', () => {
    expect(formatEdited(at(2026, 7, 1, 9, 0), now)).not.toContain('2026')
    expect(formatEdited(at(2025, 7, 1, 9, 0), now)).toContain('2025')
  })
})
