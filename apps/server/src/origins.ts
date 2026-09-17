export const ORIGIN_NOT_ALLOWED_REASON = 'origin-not-allowed'

export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0)
}

export function assertAllowedOrigin(
  origin: string | null | undefined,
  allowedOrigins: readonly string[],
): void {
  if (allowedOrigins.length === 0) {
    return
  }

  if (!origin || !allowedOrigins.includes(origin)) {
    throw Object.assign(new Error(`Rejected connection from origin: ${origin ?? '(none)'}`), {
      reason: ORIGIN_NOT_ALLOWED_REASON,
    })
  }
}
