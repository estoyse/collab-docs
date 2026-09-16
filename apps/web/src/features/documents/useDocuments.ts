import { useCallback, useEffect, useState } from 'react'
import type { DocumentSummary } from '@collab-docs/shared'

function throwForResponse(response: Response): never {
  throw Object.assign(new Error(`Request failed with ${response.status}`), {
    status: response.status,
  })
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : undefined
}

function describeLoadFailure(error: unknown): string {
  const status = statusOf(error)

  return status
    ? `The server responded with an error (${status}). Showing nothing for now.`
    : 'Could not reach the server. Showing nothing for now.'
}

function describeCreateFailure(error: unknown): string {
  const status = statusOf(error)

  if (status) {
    return `The server rejected the request (${status}). Please try again.`
  }

  return navigator.onLine
    ? 'Could not create a document. Please try again.'
    : 'Could not create a document while offline.'
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)

    fetch('/api/documents')
      .then((response) => {
        if (!response.ok) {
          throwForResponse(response)
        }

        return response.json() as Promise<DocumentSummary[]>
      })
      .then((data) => {
        setDocuments(data)
        setError(null)
      })
      .catch((error: unknown) => setError(describeLoadFailure(error)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  useEffect(() => {
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const create = useCallback(async (): Promise<DocumentSummary | null> => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throwForResponse(response)
      }

      return (await response.json()) as DocumentSummary
    } catch (error) {
      setError(describeCreateFailure(error))
      return null
    }
  }, [])

  return { documents, loading, error, create }
}
