import type { DocumentSummary } from '@collab-docs/shared'

export type DocumentGroup = {
  label: string
  documents: DocumentSummary[]
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayDiff(a: number, b: number): number {
  return Math.round((a - b) / (24 * 60 * 60 * 1000))
}

export function groupDocuments(documents: DocumentSummary[], now: Date): DocumentGroup[] {
  const today = startOfDay(now)

  const buckets: Record<string, DocumentSummary[]> = {
    Today: [],
    Yesterday: [],
    'Earlier this week': [],
    Earlier: [],
  }

  for (const document of documents) {
    const diff = dayDiff(today, startOfDay(new Date(document.updatedAt)))

    if (diff === 0) {
      buckets.Today!.push(document)
    } else if (diff === 1) {
      buckets.Yesterday!.push(document)
    } else if (diff > 1 && diff <= 7) {
      buckets['Earlier this week']!.push(document)
    } else {
      buckets.Earlier!.push(document)
    }
  }

  return (['Today', 'Yesterday', 'Earlier this week', 'Earlier'] as const)
    .filter((label) => buckets[label]!.length > 0)
    .map((label) => ({ label, documents: buckets[label]! }))
}

export function formatUpdatedAt(timestamp: number, now: Date): string {
  const date = new Date(timestamp)
  const diff = dayDiff(startOfDay(now), startOfDay(date))

  if (diff === 0 || diff === 1) {
    return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date)
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}
