import { useMemo, useSyncExternalStore } from 'react'
import type { PresenceUser } from '@collab-docs/shared'
import type { DocSession } from '@/collab/session'

export type PresenceEntry = PresenceUser & {
  clientId: number
  isSelf: boolean
}

function isPresenceUser(value: unknown): value is PresenceUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PresenceUser).name === 'string' &&
    typeof (value as PresenceUser).color === 'string'
  )
}

export function presenceEntries(
  states: Map<number, Record<string, unknown>>,
  selfClientId: number,
): PresenceEntry[] {
  const entries: PresenceEntry[] = []

  for (const [clientId, state] of states) {
    const user: unknown = state.user

    if (isPresenceUser(user)) {
      entries.push({
        clientId,
        name: user.name,
        color: user.color,
        isSelf: clientId === selfClientId,
      })
    }
  }

  return entries.sort(
    (left, right) => Number(right.isSelf) - Number(left.isSelf) || left.clientId - right.clientId,
  )
}

const EMPTY: PresenceEntry[] = []

type AwarenessLike = NonNullable<DocSession['provider']['awareness']>

function createPresenceStore(awareness: AwarenessLike | null) {
  let snapshot = EMPTY

  const read = () => {
    snapshot = awareness ? presenceEntries(awareness.getStates(), awareness.clientID) : EMPTY
  }

  read()

  return {
    subscribe(onChange: () => void) {
      if (!awareness) {
        return () => {}
      }

      const update = () => {
        read()
        onChange()
      }

      read()
      awareness.on('change', update)

      return () => awareness.off('change', update)
    },
    getSnapshot: () => snapshot,
  }
}

export function usePresence(session: DocSession | null): PresenceEntry[] {
  const awareness = session?.provider.awareness ?? null
  const store = useMemo(() => createPresenceStore(awareness), [awareness])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
