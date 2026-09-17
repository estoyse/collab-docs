const DEV_COLLAB_URL = 'ws://localhost:3001'

const WEBSOCKET_PROTOCOLS: Record<string, string> = {
  'http:': 'ws:',
  'https:': 'wss:',
}

type EndpointEnv = {
  VITE_API_URL?: string
  VITE_COLLAB_URL?: string
}

function normalizeBase(base: string | undefined): string {
  return (base ?? '').trim().replace(/\/+$/, '')
}

export function createApiUrl(base: string | undefined): (path: string) => string {
  const root = normalizeBase(base)

  return (path) => `${root}${path.startsWith('/') ? path : `/${path}`}`
}

export function resolveCollabUrl(env: EndpointEnv): string {
  const collabUrl = env.VITE_COLLAB_URL?.trim()

  if (collabUrl) {
    return collabUrl
  }

  const apiBase = normalizeBase(env.VITE_API_URL)

  if (!apiBase) {
    return DEV_COLLAB_URL
  }

  try {
    const url = new URL(apiBase)
    const protocol = WEBSOCKET_PROTOCOLS[url.protocol]

    return protocol ? `${protocol}//${url.host}` : DEV_COLLAB_URL
  } catch {
    return DEV_COLLAB_URL
  }
}

export const apiUrl = createApiUrl(import.meta.env.VITE_API_URL)

export const collabUrl = resolveCollabUrl(import.meta.env)
