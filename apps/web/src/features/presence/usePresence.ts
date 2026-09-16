import { useEffect, useState } from 'react'
import type { PresenceUser } from '@collab-docs/shared'
import type { DocSession } from '@/collab/session'

function isPresenceUser(value: unknown): value is PresenceUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PresenceUser).name === 'string' &&
    typeof (value as PresenceUser).color === 'string'
  )
}

export function usePresence(session: DocSession | null): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const awareness = session?.provider.awareness

    if (!awareness) {
      setUsers([])
      return
    }

    const update = () => {
      const seen = new Set<string>()
      const present: PresenceUser[] = []

      for (const state of awareness.getStates().values()) {
        const user: unknown = (state as { user?: unknown }).user

        if (isPresenceUser(user) && !seen.has(user.name)) {
          seen.add(user.name)
          present.push(user)
        }
      }

      setUsers(present)
    }

    update()
    awareness.on('change', update)

    return () => {
      awareness.off('change', update)
    }
  }, [session])

  return users
}
