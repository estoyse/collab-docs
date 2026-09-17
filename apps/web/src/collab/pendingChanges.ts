import type * as Y from 'yjs'

export type UpdateSource = {
  on(event: 'update', handler: UpdateHandler): void
  off(event: 'update', handler: UpdateHandler): void
}

export type UnsyncedChangesSource = {
  on(event: 'unsyncedChanges', handler: (data: { number: number }) => void): unknown
  off(event: 'unsyncedChanges', handler: (data: { number: number }) => void): unknown
}

type UpdateHandler = (
  update: Uint8Array,
  origin: unknown,
  doc: Y.Doc,
  transaction: Y.Transaction,
) => void

export function trackPendingChanges(
  doc: UpdateSource,
  provider: UnsyncedChangesSource,
  onChange: (pending: number) => void,
): () => void {
  let pending = 0

  const onUpdate: UpdateHandler = (_update, _origin, _doc, transaction) => {
    if (transaction.local) {
      pending += 1
      onChange(pending)
    }
  }

  const onUnsyncedChanges = ({ number }: { number: number }) => {
    if (number === 0 && pending !== 0) {
      pending = 0
      onChange(pending)
    }
  }

  doc.on('update', onUpdate)
  provider.on('unsyncedChanges', onUnsyncedChanges)

  return () => {
    doc.off('update', onUpdate)
    provider.off('unsyncedChanges', onUnsyncedChanges)
  }
}
