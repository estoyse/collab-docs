import type { PresenceUser } from '@collab-docs/shared'
import { colorForName } from './colors.js'

const STORAGE_KEY = 'collab-docs:identity'

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
      return parsed as PresenceUser
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
