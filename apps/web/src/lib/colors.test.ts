import { describe, expect, it } from 'vitest'
import { colorForName, PRESENCE_COLOR_COUNT, PRESENCE_COLORS } from './colors.js'

describe('colorForName', () => {
  it('always returns a colour from the ramp', () => {
    for (const name of ['Alice', 'Bob', 'Карина', '', '🙂', 'a'.repeat(200)]) {
      expect(colorForName(name)).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('is deterministic', () => {
    expect(colorForName('Alice')).toBe(colorForName('Alice'))
  })

  it('distinguishes names that differ only in case', () => {
    expect(colorForName('alice')).not.toBe(colorForName('Alice'))
  })

  it('spreads a realistic set of names across most of the ramp', () => {
    const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Erin', 'Frank', 'Grace', 'Heidi']
    const used = new Set(names.map(colorForName))

    expect(used.size).toBeGreaterThanOrEqual(4)
  })

  it('exposes a ramp size matching the CSS tokens', () => {
    expect(PRESENCE_COLOR_COUNT).toBe(8)
  })

  it('uses six-digit hex values, the format the caret extension requires', () => {
    for (const color of PRESENCE_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
