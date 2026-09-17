export type NetworkEventTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>

export type NetworkStatusSource = {
  readonly onLine: boolean
}

export type ConnectableProvider = {
  connect(): unknown
  disconnect(): unknown
}

export function bindNetworkToProvider(
  target: NetworkEventTarget,
  network: NetworkStatusSource,
  provider: ConnectableProvider,
  onNetworkChange?: (online: boolean) => void,
): () => void {
  const onOnline = () => {
    onNetworkChange?.(true)
    void provider.connect()
  }

  const onOffline = () => {
    onNetworkChange?.(false)
    void provider.disconnect()
  }

  target.addEventListener('online', onOnline)
  target.addEventListener('offline', onOffline)

  if (!network.onLine) {
    onOffline()
  }

  return () => {
    target.removeEventListener('online', onOnline)
    target.removeEventListener('offline', onOffline)
  }
}
