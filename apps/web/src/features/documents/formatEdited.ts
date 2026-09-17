const MINUTE = 60_000
const HOUR = 60 * MINUTE

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatEdited(timestamp: number, now: Date): string {
  const elapsed = now.getTime() - timestamp
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (elapsed < MINUTE) {
    return 'Edited just now'
  }

  if (elapsed < HOUR) {
    return `Edited ${relative.format(-Math.floor(elapsed / MINUTE), 'minute')}`
  }

  const days = Math.round((startOfDay(now) - startOfDay(new Date(timestamp))) / (24 * HOUR))

  if (days === 0) {
    return `Edited ${relative.format(-Math.floor(elapsed / HOUR), 'hour')}`
  }

  if (days < 7) {
    return `Edited ${relative.format(-days, 'day')}`
  }

  const edited = new Date(timestamp)
  const sameYear = edited.getFullYear() === now.getFullYear()
  const date = new Intl.DateTimeFormat(
    undefined,
    sameYear ? { month: 'short', day: 'numeric' } : { dateStyle: 'medium' },
  ).format(edited)

  return `Edited ${date}`
}
