import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.error('Service worker registration failed', error),
    onOfflineReady: () => {
      toast('Ready to work offline', {
        description: 'This app now opens without a connection.',
      })
    },
  })

  if (!needRefresh) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-md border border-hairline bg-page py-2 pl-4 pr-2 text-sm text-ink shadow-overlay sm:left-4 sm:translate-x-0">
      <span>A new version is ready.</span>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Reload
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Not now
      </Button>
    </div>
  )
}
