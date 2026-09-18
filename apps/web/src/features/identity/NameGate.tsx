import { useState, type FormEvent } from 'react'
import type { PresenceUser } from '@/lib/identity'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Wordmark } from '@/components/Wordmark'
import { colorForName } from '@/lib/colors'
import { saveIdentity } from '@/lib/identity'

export function NameGate({ onReady }: { onReady: (user: PresenceUser) => void }) {
  const [name, setName] = useState('')
  const trimmedName = name.trim()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (trimmedName) {
      onReady(saveIdentity(name))
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-8">
      <div className="flex h-14 items-center">
        <Wordmark />
      </div>

      <div className="flex flex-1 items-center justify-center pb-24">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-ink">
            What should we call you?
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Collaborators see this name on your cursor while you write.
          </p>

          <label htmlFor="name" className="mt-8 block text-sm font-medium text-ink">
            Your name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            maxLength={40}
            className="mt-2"
          />

          <div className="mt-6 pt-6">
            {trimmedName ? (
              <p className="font-serif text-base text-ink">
                Writing together
                <span
                  className="collaboration-carets__caret inline-block h-5 align-text-bottom"
                  style={{ borderColor: colorForName(trimmedName) }}
                >
                  <span
                    className="collaboration-carets__label"
                    style={{ backgroundColor: colorForName(trimmedName) }}
                  >
                    {trimmedName}
                  </span>
                </span>
              </p>
            ) : (
              <p className="invisible font-serif text-base">Writing together</p>
            )}
            <p className="mt-3 text-xs text-ink-muted">This is how your cursor looks to others.</p>
          </div>

          <Button type="submit" size="lg" className="mt-8 w-full" disabled={!trimmedName}>
            Start writing
          </Button>
        </form>
      </div>
    </div>
  )
}
