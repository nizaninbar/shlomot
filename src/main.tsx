import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startCache } from './db/cache'
import './styles/theme.css'
import './styles/global.css'

startCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
