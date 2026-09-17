import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'

type State = { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Editor crashed', error, info)
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen flex-col px-4 sm:px-8">
        <div className="flex h-14 items-center">
          <Wordmark />
        </div>

        <div className="flex flex-1 items-center justify-center pb-24">
          <div className="w-full max-w-sm">
            <h1 className="font-serif text-xl font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Your work is saved on this device. Reload the page to pick up where you left off.
            </p>
            <Button size="lg" className="mt-6" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
