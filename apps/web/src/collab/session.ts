import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import type { PresenceUser } from '@collab-docs/shared'
import { withSchemaVersion } from './serverUrl.js'

export type LocalPersistenceOutcome = 'loaded' | 'unavailable'

export type DocSession = {
  doc: Y.Doc
  provider: HocuspocusProvider
  whenLocalLoaded: Promise<LocalPersistenceOutcome>
  destroy(): void
}

function probeIndexedDb(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('collab-docs:storage-probe')

      request.onsuccess = () => {
        request.result.close()
        resolve(true)
      }

      request.onerror = () => resolve(false)
      request.onblocked = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

export function createDocSession(options: {
  docId: string
  serverUrl: string
  user: PresenceUser
}): DocSession {
  const { docId, serverUrl, user } = options
  const doc = new Y.Doc()
  let localPersistence: IndexeddbPersistence | null = null
  let destroyed = false

  const whenLocalLoaded = probeIndexedDb().then(
    (storageWorks): LocalPersistenceOutcome | Promise<LocalPersistenceOutcome> => {
      if (!storageWorks || destroyed) {
        return 'unavailable'
      }

      try {
        localPersistence = new IndexeddbPersistence(`collab-docs:${docId}`, doc)
      } catch {
        return 'unavailable'
      }

      return localPersistence.whenSynced.then(() => 'loaded')
    },
  )

  const provider = new HocuspocusProvider({
    url: withSchemaVersion(serverUrl),
    name: docId,
    document: doc,
  })

  provider.awareness?.setLocalStateField('user', user)

  return {
    doc,
    provider,
    whenLocalLoaded,

    destroy() {
      destroyed = true
      provider.destroy()
      localPersistence?.destroy().catch((error: unknown) => {
        console.error('Failed to close local persistence', error)
      })
      doc.destroy()
    },
  }
}
