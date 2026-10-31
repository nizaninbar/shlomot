import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyFontSize } from './lib/fontSize'
import { startCache } from './db/cache'
import './styles/theme.css'
import './styles/global.css'

applyFontSize()
startCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
