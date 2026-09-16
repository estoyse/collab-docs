import { useEffect, useState } from 'react'
import type { PresenceUser } from '@collab-docs/shared'
import {
  applyStatusChange,
  deriveConnectionState,
  type ConnectionInput,
  type ConnectionState,
} from './connection.js'
import { createDocSession, type DocSession } from './session.js'

const SERVER_URL = import.meta.env.VITE_COLLAB_URL ?? 'ws://localhost:3001'

export type DocSessionState = {
  session: DocSession | null
  ready: boolean
  offlineStorageAvailable: boolean
  connection: ConnectionState
  pendingChanges: number
}

export function useDocSession(docId: string, user: PresenceUser): DocSessionState {
  const [session, setSession] = useState<DocSession | null>(null)
  const [ready, setReady] = useState(false)
  const [offlineStorageAvailable, setOfflineStorageAvailable] = useState(true)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [pendingChanges, setPendingChanges] = useState(0)

  useEffect(() => {
    let cancelled = false
    const created = createDocSession({ docId, serverUrl: SERVER_URL, user })

    const input: ConnectionInput = {
      status: 'connecting',
      synced: false,
      online: navigator.onLine,
    }

    const publish = () => {
      if (!cancelled) {
        setConnection(deriveConnectionState(input))
      }
    }

    const onStatus = ({ status }: { status: ConnectionInput['status'] }) => {
      applyStatusChange(input, status)
      publish()
    }

    const onSynced = ({ state }: { state: boolean }) => {
      input.synced = state
      publish()
    }

    const onUnsynced = ({ number }: { number: number }) => {
      if (!cancelled) {
        setPendingChanges(number)
      }
    }

    const onNetworkChange = () => {
      input.online = navigator.onLine
      publish()
    }

    created.provider.on('status', onStatus)
    created.provider.on('synced', onSynced)
    created.provider.on('unsyncedChanges', onUnsynced)
    window.addEventListener('online', onNetworkChange)
    window.addEventListener('offline', onNetworkChange)

    setSession(created)
    publish()

    void created.whenLocalReady.then((available) => {
      if (cancelled) {
        return
      }

      setOfflineStorageAvailable(available)
      setReady(true)
    })

    return () => {
      cancelled = true
      created.provider.off('status', onStatus)
      created.provider.off('synced', onSynced)
      created.provider.off('unsyncedChanges', onUnsynced)
      window.removeEventListener('online', onNetworkChange)
      window.removeEventListener('offline', onNetworkChange)
      created.destroy()
      setSession(null)
      setReady(false)
    }
  }, [docId, user.name, user.color])

  return { session, ready, offlineStorageAvailable, connection, pendingChanges }
}
