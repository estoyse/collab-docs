import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'

type Props = {
  children: ReactNode
  resetKey?: string
  title?: string
  description?: string
  fullPage?: boolean
}

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info)
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    const { error } = this.state

    if (!error) {
      return this.props.children
    }

    const {
      title = 'Something went wrong',
      description = 'Reload the page to try again. Documents already synced are safe on the server.',
      fullPage = true,
    } = this.props

    const content = (
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{description}</p>
        <div className="mt-6 flex items-center gap-4">
          <Button size="lg" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          {!fullPage && (
            <Link
              to="/"
              className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Back to documents
            </Link>
          )}
        </div>
      </div>
    )

    if (!fullPage) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-24">{content}</div>
      )
    }

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-8">
        <div className="flex h-14 items-center">
          <Wordmark />
        </div>
        <div className="flex flex-1 items-center justify-center pb-24">{content}</div>
      </div>
    )
  }
}
