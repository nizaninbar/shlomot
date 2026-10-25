import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { seedIfEmpty } from './db/seed'
import './styles/theme.css'
import './styles/global.css'

seedIfEmpty().catch(console.error)
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
