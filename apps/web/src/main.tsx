import '@fontsource-variable/inter-tight'
import '@fontsource-variable/source-serif-4'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppShell } from './AppShell.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { UpdatePrompt } from './components/UpdatePrompt.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppShell />
      <UpdatePrompt />
    </ErrorBoundary>
  </StrictMode>,
)
