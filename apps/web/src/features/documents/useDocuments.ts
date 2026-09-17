import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentSummary } from '@collab-docs/shared'
import { apiUrl } from '@/lib/api'
import { loadCachedDocuments, saveCachedDocuments } from '@/lib/documentsCache'

function throwForResponse(response: Response): never {
  throw Object.assign(new Error(`Request failed with ${response.status}`), {
    status: response.status,
  })
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : undefined
}

export function describeLoadFailure(error: unknown, showingSavedList: boolean): string {
  const status = statusOf(error)

  if (status) {
    return showingSavedList
      ? `The server responded with an error (${status}). Showing the last list saved on this device.`
      : `The server responded with an error (${status}). Please try again later.`
  }

  return showingSavedList
    ? 'Could not reach the server. Showing the last list saved on this device. Reconnect to refresh.'
    : 'Could not reach the server. Reconnect to see your documents.'
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
  const [initialDocuments] = useState(loadCachedDocuments)
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments ?? [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasList = useRef(initialDocuments !== null)
  const latestRequest = useRef(0)

  const refresh = useCallback(() => {
    const request = latestRequest.current + 1
    latestRequest.current = request
    setLoading(true)

    fetch(apiUrl('/api/documents'))
      .then((response) => {
        if (!response.ok) {
          throwForResponse(response)
        }

        return response.json() as Promise<DocumentSummary[]>
      })
      .then((data) => {
        if (request !== latestRequest.current) {
          return
        }

        hasList.current = true
        saveCachedDocuments(data)
        setDocuments(data)
        setError(null)
      })
      .catch((error: unknown) => {
        if (request === latestRequest.current) {
          setError(describeLoadFailure(error, hasList.current))
        }
      })
      .finally(() => {
        if (request === latestRequest.current) {
          setLoading(false)
        }
      })
  }, [])

  useEffect(() => {
    refresh()

    return () => {
      latestRequest.current += 1
    }
  }, [refresh])

  useEffect(() => {
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  const create = useCallback(async (): Promise<DocumentSummary | null> => {
    try {
      const response = await fetch(apiUrl('/api/documents'), {
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
