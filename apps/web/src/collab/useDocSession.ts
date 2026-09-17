import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SCHEMA_MISMATCH_REASON } from '@collab-docs/shared'
import { collabUrl } from '@/lib/api'
import type { PresenceUser } from '@/lib/identity'
import {
  applyStatusChange,
  deriveConnectionState,
  type ConnectionInput,
  type ConnectionState,
} from './connection.js'
import { watchLocalReadiness } from './localReady.js'
import { bindNetworkToProvider } from './network.js'
import { trackPendingChanges } from './pendingChanges.js'
import { createDocSession, type DocSession } from './session.js'

const LOCAL_READY_TIMEOUT_MS = 3000
const SCHEMA_MISMATCH_TOAST_ID = 'schema-mismatch'

export type DocSessionState = {
  session: DocSession | null
  ready: boolean
  offlineStorageAvailable: boolean
  connection: ConnectionState
  pendingChanges: number
  outdated: boolean
}

function showOutdatedToast(): void {
  toast.error('This tab is running an older version', {
    id: SCHEMA_MISMATCH_TOAST_ID,
    description: 'Reload the page to keep editing with others. Your changes are saved on this device.',
    duration: Infinity,
    action: { label: 'Reload', onClick: () => window.location.reload() },
  })
}

export function useDocSession(docId: string, user: PresenceUser): DocSessionState {
  const [session, setSession] = useState<DocSession | null>(null)
  const [ready, setReady] = useState(false)
  const [offlineStorageAvailable, setOfflineStorageAvailable] = useState(true)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [pendingChanges, setPendingChanges] = useState(0)
  const [outdated, setOutdated] = useState(false)

  const { name, color } = user

  useEffect(() => {
    let cancelled = false
    const created = createDocSession({ docId, serverUrl: collabUrl, user: { name, color } })
    const { provider } = created

    let input: ConnectionInput = {
      status: provider.configuration.websocketProvider.status,
      synced: provider.synced,
      online: navigator.onLine,
    }

    const publish = () => {
      if (!cancelled) {
        setConnection(deriveConnectionState(input))
      }
    }

    const onStatus = ({ status }: { status: ConnectionInput['status'] }) => {
      input = applyStatusChange(input, status)
      publish()
    }

    const onSynced = ({ state }: { state: boolean }) => {
      input = { ...input, synced: state }
      publish()
    }

    provider.on('status', onStatus)
    provider.on('synced', onSynced)

    const unbindNetwork = bindNetworkToProvider(window, navigator, provider, (online) => {
      input = { ...input, online }
      publish()
    })

    const stopTrackingPending = trackPendingChanges(created.doc, provider, (pending) => {
      if (!cancelled) {
        setPendingChanges(pending)
      }
    })

    const onAuthenticationFailed = ({ reason }: { reason: string }) => {
      if (reason !== SCHEMA_MISMATCH_REASON || cancelled) {
        return
      }

      unbindNetwork()
      provider.disconnect()
      setOutdated(true)
      showOutdatedToast()
    }

    provider.on('authenticationFailed', onAuthenticationFailed)

    const stopWatchingLocal = watchLocalReadiness(
      created.whenLocalLoaded,
      LOCAL_READY_TIMEOUT_MS,
      (readiness) => {
        if (!cancelled) {
          setReady(readiness.ready)
          setOfflineStorageAvailable(readiness.offlineStorageAvailable)
        }
      },
    )

    setSession(created)
    publish()

    return () => {
      cancelled = true
      stopWatchingLocal()
      stopTrackingPending()
      unbindNetwork()
      provider.off('status', onStatus)
      provider.off('synced', onSynced)
      provider.off('authenticationFailed', onAuthenticationFailed)
      created.destroy()
      setSession(null)
      setReady(false)
      setPendingChanges(0)
      setOfflineStorageAvailable(true)
      setOutdated(false)
    }
  }, [docId, name, color])

  return { session, ready, offlineStorageAvailable, connection, pendingChanges, outdated }
}
