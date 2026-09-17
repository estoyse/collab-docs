import { DOC_SCHEMA_VERSION, SCHEMA_VERSION_PARAMETER } from '@collab-docs/shared'

export function withSchemaVersion(serverUrl: string): string {
  const version = String(DOC_SCHEMA_VERSION)

  try {
    const url = new URL(serverUrl)
    url.searchParams.set(SCHEMA_VERSION_PARAMETER, version)

    return url.toString()
  } catch {
    const query = new URLSearchParams({ [SCHEMA_VERSION_PARAMETER]: version })

    return `${serverUrl}${serverUrl.includes('?') ? '&' : '?'}${query}`
  }
}
