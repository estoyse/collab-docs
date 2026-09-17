import { colorForName } from './colors.js'

export type PresenceUser = {
  name: string
  color: string
}

const STORAGE_KEY = 'collab-docs:identity'
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

export function loadIdentity(): PresenceUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as PresenceUser).name === 'string' &&
      typeof (parsed as PresenceUser).color === 'string'
    ) {
      const stored = parsed as PresenceUser

      return HEX_COLOR.test(stored.color)
        ? stored
        : saveIdentity(stored.name)
    }

    return null
  } catch {
    return null
  }
}

export function saveIdentity(name: string): PresenceUser {
  const trimmed = name.trim()
  const identity: PresenceUser = { name: trimmed, color: colorForName(trimmed) }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    return identity
  }

  return identity
}
