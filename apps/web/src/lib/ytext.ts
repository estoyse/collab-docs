import { useCallback, useEffect, useState } from 'react'
import * as Y from 'yjs'

export function applyTextDiff(ytext: Y.Text, next: string): void {
  const current = ytext.toString()

  if (current === next) {
    return
  }

  let start = 0

  while (start < current.length && start < next.length && current[start] === next[start]) {
    start += 1
  }

  let endCurrent = current.length
  let endNext = next.length

  while (
    endCurrent > start &&
    endNext > start &&
    current[endCurrent - 1] === next[endNext - 1]
  ) {
    endCurrent -= 1
    endNext -= 1
  }

  const write = () => {
    if (endCurrent > start) {
      ytext.delete(start, endCurrent - start)
    }

    if (endNext > start) {
      ytext.insert(start, next.slice(start, endNext))
    }
  }

  if (ytext.doc) {
    ytext.doc.transact(write)
  } else {
    write()
  }
}

export function useYText(
  doc: Y.Doc | null,
  key: string,
): [string, (next: string) => void] {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!doc) {
      setValue('')
      return
    }

    const ytext = doc.getText(key)
    const update = () => setValue(ytext.toString())

    update()
    ytext.observe(update)

    return () => {
      ytext.unobserve(update)
    }
  }, [doc, key])

  const set = useCallback(
    (next: string) => {
      if (doc) {
        applyTextDiff(doc.getText(key), next)
      }
    },
    [doc, key],
  )

  return [value, set]
}
