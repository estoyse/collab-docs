import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-hairline bg-page px-4 py-3 shadow-sm">
      <span className="text-sm">A new version is available.</span>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Reload
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </Button>
    </div>
  )
}
