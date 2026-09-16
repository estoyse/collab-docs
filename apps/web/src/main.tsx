import '@fontsource-variable/inter-tight'
import '@fontsource-variable/source-serif-4'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppShell } from './AppShell.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
)
