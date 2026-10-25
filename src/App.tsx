import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Equipment from './pages/Equipment'
import Home from './pages/Home'
import LessonForm from './pages/LessonForm'
import WorkoutDetail from './pages/WorkoutDetail'
import WorkoutForm from './pages/WorkoutForm'

export default function App() {
  return (
    <HashRouter>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout/new" element={<WorkoutForm />} />
          <Route path="/workout/:id" element={<WorkoutDetail />} />
          <Route path="/workout/:id/edit" element={<WorkoutForm />} />
          <Route path="/workout/:id/clone" element={<WorkoutForm clone />} />
          <Route path="/workout/:id/lesson/new" element={<LessonForm />} />
          <Route path="/lesson/:lessonId/edit" element={<LessonForm />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </HashRouter>
  )
}
