export type ConnectionState = 'connecting' | 'synced' | 'syncing' | 'offline'

export type ConnectionInput = {
  status: 'connecting' | 'connected' | 'disconnected'
  synced: boolean
  online: boolean
}

export function deriveConnectionState(input: ConnectionInput): ConnectionState {
  if (!input.online || input.status === 'disconnected') {
    return 'offline'
  }

  if (input.status === 'connecting') {
    return 'connecting'
  }

  return input.synced ? 'synced' : 'syncing'
}
