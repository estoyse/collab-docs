import type express from 'express'
import type * as Y from 'yjs'
import { Database } from '@hocuspocus/extension-database'
import { Server } from '@hocuspocus/server'
import {
  DEFAULT_DOCUMENT_TITLE,
  DOC_SCHEMA_VERSION,
  SCHEMA_MISMATCH_REASON,
  SCHEMA_VERSION_PARAMETER,
  type DocumentSummary,
} from '@collab-docs/shared'
import { DOCUMENT_ID_PATTERN } from '../documents/documentId.js'
import type { DocumentStore } from '../documents/store.js'
import { assertAllowedOrigin } from '../origins.js'
import { extractExcerpt, extractTitle } from './title.js'

export function assertSupportedClient(parameters: URLSearchParams): void {
  if (parameters.get(SCHEMA_VERSION_PARAMETER) !== String(DOC_SCHEMA_VERSION)) {
    throw Object.assign(new Error('Client schema version mismatch'), {
      reason: SCHEMA_MISMATCH_REASON,
    })
  }
}

export function assertValidDocumentName(documentName: string): void {
  if (!DOCUMENT_ID_PATTERN.test(documentName)) {
    throw new Error(`Rejected malformed document name: ${documentName}`)
  }
}

async function extractOrFallback(
  documentName: string,
  field: string,
  extract: () => string,
  fallback: () => Promise<string>,
): Promise<string> {
  try {
    return extract()
  } catch (error) {
    console.error(`Failed to extract the ${field} of document "${documentName}"`, error)
    return fallback()
  }
}

export function createPersistenceHooks(store: DocumentStore) {
  return {
    fetch: async ({ documentName }: { documentName: string }): Promise<Uint8Array | null> => {
      try {
        return await store.loadState(documentName)
      } catch (error) {
        console.error(`Failed to load document "${documentName}"`, error)
        throw error
      }
    },

    store: async ({
      documentName,
      state,
      document,
    }: {
      documentName: string
      state: Uint8Array
      document: Y.Doc
    }): Promise<void> => {
      try {
        let previous: Promise<DocumentSummary | null> | undefined
        const loadPrevious = () => (previous ??= store.get(documentName))
        const title = await extractOrFallback(
          documentName,
          'title',
          () => extractTitle(document),
          async () => (await loadPrevious())?.title ?? DEFAULT_DOCUMENT_TITLE,
        )
        const excerpt = await extractOrFallback(
          documentName,
          'excerpt',
          () => extractExcerpt(document),
          async () => (await loadPrevious())?.excerpt ?? '',
        )

        await store.saveState(documentName, new Uint8Array(state), title, excerpt)
      } catch (error) {
        console.error(`Failed to store document "${documentName}"`, error)
        throw error
      }
    },
  }
}

export function createCollabServer(options: {
  store: DocumentStore
  port: number
  app: express.Express
  allowedOrigins?: readonly string[]
}): Server {
  const { store, port, app, allowedOrigins = [] } = options

  return new Server({
    port,
    quiet: true,
    stopOnSignals: false,
    debounce: 1000,
    maxDebounce: 5000,

    extensions: [new Database(createPersistenceHooks(store))],

    onConnect: async ({ documentName, requestHeaders, requestParameters }) => {
      assertAllowedOrigin(requestHeaders.get('origin'), allowedOrigins)
      assertValidDocumentName(documentName)
      assertSupportedClient(requestParameters)
    },

    onRequest: ({ request, response }) =>
      new Promise((_resolve, reject) => {
        app(request, response)
        reject()
      }),
  })
}
