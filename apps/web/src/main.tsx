import '@fontsource-variable/dm-sans'
import '@fontsource-variable/literata'
import '@fontsource-variable/literata/wght-italic.css'
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
