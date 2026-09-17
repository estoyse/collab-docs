import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import * as Y from 'yjs'
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider'
import type { Server } from '@hocuspocus/server'
import {
  DOC_BODY_FIELD,
  DOC_SCHEMA_VERSION,
  DOC_TITLE_KEY,
  SCHEMA_VERSION_PARAMETER,
} from '@collab-docs/shared'
import { openDatabase, type Db } from '../db.js'
import { createDocumentStore, type DocumentStore } from '../documents/store.js'
import { createCollabServer } from '../collab/server.js'

export type RunningServer = {
  url: string
  server: Server
  store: DocumentStore
  db: Db
  stop(): Promise<void>
}

export type Client = {
  doc: Y.Doc
  provider: HocuspocusProvider
  destroy(): void
}

export type ConnectOptions = {
  doc?: Y.Doc
  sendSchemaVersion?: boolean
  onAuthenticated?: () => void
  onAuthenticationFailed?: (reason: string) => void
}

export async function waitFor(
  predicate: () => boolean,
  timeoutMs = 8000,
  label = 'condition',
): Promise<void> {
  const startedAt = Date.now()

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

export function paragraph(text: string): Y.XmlElement {
  const element = new Y.XmlElement('paragraph')
  element.insert(0, [new Y.XmlText(text)])

  return element
}

export function appendParagraph(doc: Y.Doc, text: string): void {
  const body = doc.getXmlFragment(DOC_BODY_FIELD)
  body.insert(body.length, [paragraph(text)])
}

export function paragraphText(doc: Y.Doc, index: number): Y.XmlText {
  const element = doc.getXmlFragment(DOC_BODY_FIELD).get(index)

  if (!(element instanceof Y.XmlElement)) {
    throw new Error(`No paragraph at index ${index}`)
  }

  const text = element.get(0)

  if (!(text instanceof Y.XmlText)) {
    throw new Error(`Paragraph ${index} has no text node`)
  }

  return text
}

function serializeNode(node: Y.XmlElement | Y.XmlText | Y.XmlHook): string {
  if (node instanceof Y.XmlText) {
    return node
      .toDelta()
      .map((operation: { insert?: unknown }) =>
        typeof operation.insert === 'string' ? operation.insert : '',
      )
      .join('')
  }

  if (node instanceof Y.XmlElement) {
    return `<${node.nodeName}>${node.toArray().map(serializeNode).join('')}</${node.nodeName}>`
  }

  return ''
}

export function bodyText(doc: Y.Doc): string {
  return doc.getXmlFragment(DOC_BODY_FIELD).toArray().map(serializeNode).join('\n')
}

export function titleText(doc: Y.Doc): string {
  return doc.getText(DOC_TITLE_KEY).toString()
}

export function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

export function isSynced(client: Client): boolean {
  return client.provider.isSynced && client.provider.unsyncedChanges === 0
}

export function isDisconnected(client: Client): boolean {
  return client.provider.configuration.websocketProvider.status === WebSocketStatus.Disconnected
}

export function docsConverged(...docs: Y.Doc[]): boolean {
  const [first, ...rest] = docs

  if (!first) {
    return true
  }

  return rest.every(
    (doc) => bodyText(doc) === bodyText(first) && titleText(doc) === titleText(first),
  )
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createCollabHarness() {
  const clients = new Set<Client>()
  const servers = new Set<RunningServer>()
  const tempDirectories: string[] = []

  function tempDatabasePath(): string {
    const directory = mkdtempSync(join(tmpdir(), 'collab-docs-integration-'))
    tempDirectories.push(directory)

    return join(directory, 'documents.db')
  }

  async function startServer(databasePath = ':memory:'): Promise<RunningServer> {
    const db = openDatabase(databasePath)
    const store = createDocumentStore(db)
    const server = createCollabServer({ store, port: 0, app: express() })
    await server.listen()

    let stopped = false

    const running: RunningServer = {
      url: `ws://127.0.0.1:${server.address.port}`,
      server,
      store,
      db,
      async stop() {
        if (stopped) {
          return
        }

        stopped = true
        servers.delete(running)
        await server.destroy()
        db.close()
      },
    }

    servers.add(running)

    return running
  }

  function connect(running: RunningServer, name: string, options: ConnectOptions = {}): Client {
    const doc = options.doc ?? new Y.Doc()
    const sendSchemaVersion = options.sendSchemaVersion ?? true
    const query = new URLSearchParams({ [SCHEMA_VERSION_PARAMETER]: String(DOC_SCHEMA_VERSION) })
    const url = sendSchemaVersion ? `${running.url}?${query}` : running.url

    const provider = new HocuspocusProvider({
      url,
      name,
      document: doc,
      onAuthenticated: () => options.onAuthenticated?.(),
      onAuthenticationFailed: ({ reason }) => options.onAuthenticationFailed?.(reason),
    })

    let destroyed = false

    const client: Client = {
      doc,
      provider,
      destroy() {
        if (destroyed) {
          return
        }

        destroyed = true
        clients.delete(client)
        provider.destroy()
        doc.destroy()
      },
    }

    clients.add(client)

    return client
  }

  async function cleanup(): Promise<void> {
    for (const client of [...clients]) {
      client.destroy()
    }

    for (const running of [...servers]) {
      await running.stop()
    }

    for (const directory of tempDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  return { startServer, connect, tempDatabasePath, cleanup }
}
