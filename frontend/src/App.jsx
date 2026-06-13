import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'
import PatientDashboard from './pages/PatientDashboard.jsx'
import Hospitals from './pages/Hospitals.jsx'
import BookTicket from './pages/BookTicket.jsx'
import QueueStatus from './pages/QueueStatus.jsx'
import AIAssistant from './pages/AIAssistant.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import Notifications from './pages/Notifications.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />


        <Route path="/hospitals" element={<Hospitals />} />
        <Route path="/book-ticket" element={<BookTicket />} />
        <Route path="/queue-status/:ticketId" element={<QueueStatus />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
