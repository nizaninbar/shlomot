import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Equipment from './pages/Equipment'
import Home from './pages/Home'

export default function App() {
  return (
    <HashRouter>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </HashRouter>
  )
}
