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

export function createDocSession(options: {
  docId: string
  serverUrl: string
  user: PresenceUser
}): DocSession {
  const { docId, serverUrl, user } = options
  const doc = new Y.Doc()

  const localPersistence = createLocalPersistence(docId, doc)

  const whenLocalReady: Promise<boolean> = localPersistence
    ? Promise.race([
        localPersistence.whenSynced.then(() => true),
        new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), LOCAL_READY_TIMEOUT_MS)
        }),
      ])
    : Promise.resolve(false)

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
