import { useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'

export type TextSplice = {
  start: number
  end: number
  text: string
}

export type TextDeltaOp = {
  insert?: unknown
  retain?: number
  delete?: number
}

export function spliceBetween(from: string, to: string): TextSplice | null {
  if (from === to) {
    return null
  }

  let start = 0

  while (start < from.length && start < to.length && from[start] === to[start]) {
    start += 1
  }

  let endFrom = from.length
  let endTo = to.length

  while (endFrom > start && endTo > start && from[endFrom - 1] === to[endTo - 1]) {
    endFrom -= 1
    endTo -= 1
  }

  return { start, end: endFrom, text: to.slice(start, endTo) }
}

function mapInsertionPoint(position: number, remote: TextSplice): number {
  if (position <= remote.start) {
    return position
  }

  if (position >= remote.end) {
    return position + remote.text.length - (remote.end - remote.start)
  }

  return remote.start + remote.text.length
}

function transact(ytext: Y.Text, write: () => void): void {
  if (ytext.doc) {
    ytext.doc.transact(write)
  } else {
    write()
  }
}

export function applyTextDiff(ytext: Y.Text, next: string, base?: string): void {
  const current = ytext.toString()
  const local = spliceBetween(base ?? current, next)

  if (!local) {
    return
  }

  const remote = base === undefined ? null : spliceBetween(base, current)
  const shift = remote ? remote.text.length - (remote.end - remote.start) : 0
  const deletions: Array<[number, number]> = []

  if (!remote) {
    if (local.end > local.start) {
      deletions.push([local.start, local.end])
    }
  } else {
    if (local.start < Math.min(local.end, remote.start)) {
      deletions.push([local.start, Math.min(local.end, remote.start)])
    }

    if (Math.max(local.start, remote.end) < local.end) {
      deletions.push([Math.max(local.start, remote.end) + shift, local.end + shift])
    }
  }

  const insertAt = Math.min(remote ? mapInsertionPoint(local.start, remote) : local.start, current.length)

  transact(ytext, () => {
    for (const [from, to] of deletions.reverse()) {
      const clampedTo = Math.min(to, ytext.length)

      if (clampedTo > from) {
        ytext.delete(from, clampedTo - from)
      }
    }

    if (local.text) {
      ytext.insert(Math.min(insertAt, ytext.length), local.text)
    }
  })
}

export function mapIndexThroughDelta(index: number, delta: TextDeltaOp[]): number {
  let oldPosition = 0
  let mapped = index

  for (const op of delta) {
    if (oldPosition > index) {
      break
    }

    if (op.retain !== undefined) {
      oldPosition += op.retain
    } else if (op.delete !== undefined) {
      if (oldPosition >= index) {
        break
      }

      mapped -= Math.min(op.delete, index - oldPosition)
      oldPosition += op.delete
    } else if (op.insert !== undefined) {
      if (oldPosition >= index) {
        break
      }

      mapped += typeof op.insert === 'string' ? op.insert.length : 1
    }
  }

  return mapped
}

export function useYText(
  doc: Y.Doc | null,
  key: string,
): [string, (next: string) => void] {
  const ytext = useMemo(() => doc?.getText(key) ?? null, [doc, key])

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!ytext) {
        return () => {}
      }

      const observer = () => onChange()
      ytext.observe(observer)

      return () => ytext.unobserve(observer)
    },
    [ytext],
  )

  const getSnapshot = useCallback(() => ytext?.toString() ?? '', [ytext])
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const displayed = useRef(value)

  useLayoutEffect(() => {
    displayed.current = value
  }, [value])

  const set = useCallback(
    (next: string) => {
      if (ytext) {
        applyTextDiff(ytext, next, displayed.current)
      }
    },
    [ytext],
  )

  return [value, set]
}
