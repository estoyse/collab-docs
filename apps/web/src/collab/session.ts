import { HocuspocusProvider } from '@hocuspocus/provider'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import type { PresenceUser } from '@collab-docs/shared'

const LOCAL_READY_TIMEOUT_MS = 3000

export type DocSession = {
  doc: Y.Doc
  provider: HocuspocusProvider
  whenLocalReady: Promise<boolean>
  destroy(): void
}

function createLocalPersistence(docId: string, doc: Y.Doc): IndexeddbPersistence | null {
  if (typeof indexedDB === 'undefined') {
    return null
  }

  try {
    return new IndexeddbPersistence(`collab-docs:${docId}`, doc)
  } catch {
    return null
  }
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

  const storageProbe = probeIndexedDb()
  const localPersistence = createLocalPersistence(docId, doc)

  const whenLocalReady: Promise<boolean> = Promise.race([
    storageProbe.then((storageWorks) => {
      if (!storageWorks || !localPersistence) {
        return false
      }

      return localPersistence.whenSynced.then(
        () => true,
        () => false,
      )
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), LOCAL_READY_TIMEOUT_MS)
    }),
  ])

  const provider = new HocuspocusProvider({
    url: serverUrl,
    name: docId,
    document: doc,
  })

  provider.awareness?.setLocalStateField('user', user)

  return {
    doc,
    provider,
    whenLocalReady,

    destroy() {
      provider.destroy()
      localPersistence?.destroy().catch((error: unknown) => {
        console.error('Failed to close local persistence', error)
      })
      doc.destroy()
    },
  }
}
