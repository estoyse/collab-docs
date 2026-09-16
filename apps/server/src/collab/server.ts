import type express from 'express'
import { Database } from '@hocuspocus/extension-database'
import { Server } from '@hocuspocus/server'
import type { DocumentStore } from '../documents/store.js'
import { extractTitle } from './title.js'

const DOCUMENT_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export function createCollabServer(options: {
  store: DocumentStore
  port: number
  app: express.Express
}): Server {
  const { store, port, app } = options

  return new Server({
    port,
    quiet: true,
    stopOnSignals: false,
    debounce: 1000,
    maxDebounce: 5000,

    extensions: [
      new Database({
        fetch: async ({ documentName }) => store.loadState(documentName),
        store: async ({ documentName, state, document }) => {
          store.saveState(documentName, new Uint8Array(state), extractTitle(document))
        },
      }),
    ],

    onConnect: async ({ documentName }) => {
      if (!DOCUMENT_NAME_PATTERN.test(documentName)) {
        throw new Error(`Rejected malformed document name: ${documentName}`)
      }
    },

    onRequest: ({ request, response }) =>
      new Promise((_resolve, reject) => {
        app(request, response)
        reject()
      }),
  })
}
