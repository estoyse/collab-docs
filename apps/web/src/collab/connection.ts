export type ConnectionState = 'connecting' | 'synced' | 'syncing' | 'offline'

export type ConnectionInput = {
  status: 'connecting' | 'connected' | 'disconnected'
  synced: boolean
  online: boolean
}

export function applyStatusChange(
  input: ConnectionInput,
  status: ConnectionInput['status'],
): ConnectionInput {
  return {
    ...input,
    status,
    synced: status === 'connected' ? input.synced : false,
  }
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

export type ConnectionToast = 'offline' | 'back-online' | null

export type ConnectionToastResult = {
  toast: ConnectionToast
  inOfflineEpisode: boolean
}

export function deriveConnectionToast(
  inOfflineEpisode: boolean,
  connection: ConnectionState,
): ConnectionToastResult {
  if (connection === 'offline' && !inOfflineEpisode) {
    return { toast: 'offline', inOfflineEpisode: true }
  }

  if (connection === 'synced' && inOfflineEpisode) {
    return { toast: 'back-online', inOfflineEpisode: false }
  }

  return { toast: null, inOfflineEpisode }
}
