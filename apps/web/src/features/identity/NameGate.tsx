import { useState, type FormEvent } from 'react'
import type { PresenceUser } from '@collab-docs/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveIdentity } from '@/lib/identity'

export function NameGate({ onReady }: { onReady: (user: PresenceUser) => void }) {
  const [name, setName] = useState('')

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (name.trim()) {
      onReady(saveIdentity(name))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-hairline bg-page p-8"
      >
        <h1 className="font-serif text-lg">What should we call you?</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your collaborators will see this name on your cursor.
        </p>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoFocus
          className="mt-6"
        />
        <Button type="submit" className="mt-4 w-full" disabled={!name.trim()}>
          Start writing
        </Button>
      </form>
    </div>
  )
}
