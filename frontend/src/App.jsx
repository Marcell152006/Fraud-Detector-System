import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import SinglePrediction from './pages/SinglePrediction'
import BatchUpload from './pages/BatchUpload'
import History from './pages/History'
import Analytics from './pages/Analytics'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="predict"    element={<SinglePrediction />} />
        <Route path="upload"     element={<BatchUpload />} />
        <Route path="history"    element={<History />} />
        <Route path="analytics"  element={<Analytics />} />
      </Route>
    </Routes>
  )
}
