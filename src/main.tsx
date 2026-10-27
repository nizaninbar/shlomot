import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startAutoSync } from './db/autosync'
import { seedIfEmpty } from './db/seed'
import './styles/theme.css'
import './styles/global.css'

seedIfEmpty().catch(console.error).finally(startAutoSync)
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
