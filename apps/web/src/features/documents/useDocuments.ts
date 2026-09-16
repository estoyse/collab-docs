import { useCallback, useEffect, useState } from 'react'
import type { DocumentSummary } from '@collab-docs/shared'

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)

    fetch('/api/documents')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`)
        }

        return response.json() as Promise<DocumentSummary[]>
      })
      .then((data) => {
        setDocuments(data)
        setError(null)
      })
      .catch(() => setError('Could not reach the server. Showing nothing for now.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  const create = useCallback(async (): Promise<DocumentSummary | null> => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
      }

      return (await response.json()) as DocumentSummary
    } catch {
      setError('Could not create a document while offline.')
      return null
    }
  }, [])

  return { documents, loading, error, create, refresh }
}
