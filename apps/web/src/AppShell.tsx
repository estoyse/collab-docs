import { useLayoutEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import type { PresenceUser } from '@collab-docs/shared'
import { Toaster } from '@/components/ui/sonner'
import { DocumentList } from '@/features/documents/DocumentList'
import { NameGate } from '@/features/identity/NameGate'
import { DocumentRoute } from '@/editor/DocumentPage'
import { loadIdentity } from '@/lib/identity'

export function AppShell() {
  const [user, setUser] = useState<PresenceUser | null>(() => loadIdentity())

  useLayoutEffect(() => {
    if (user) {
      document.documentElement.style.setProperty('--self', user.color)
    }
  }, [user])

  if (!user) {
    return <NameGate onReady={setUser} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocumentList />} />
        <Route path="/d/:docId" element={<DocumentRoute user={user} />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
