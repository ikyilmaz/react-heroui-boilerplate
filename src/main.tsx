import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App'
import { initColorMode } from '@/synergy/shared/themeSettings'

// Açık / koyu, ilk çizimden önce
initColorMode()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
