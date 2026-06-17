import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

import HomePage from './pages/HomePage'
import RecordingPage from './pages/RecordingPage'
import ReportsPage from './pages/ReportsPage'
import CheckInPage from './pages/CheckInPage'
import PeoplePage from './pages/PeoplePage'
import SettingsPage from './pages/SettingsPage'

import AnalysisProgressPage from './pages/AnalysisProgressPage'
import CallSummaryPage from './pages/CallSummaryPage'
import MoodTimelinePage from './pages/MoodTimelinePage'
import ReliabilityInsightsPage from './pages/ReliabilityInsightsPage'
import ExportReportPage from './pages/ExportReportPage'
import VoiceAuthenticityPage from './pages/VoiceAuthenticityPage'

import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import BillingPage from './pages/BillingPage'
import AdminDashboardPage from './pages/AdminDashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected flow pages — no sidebar/nav */}
        <Route path="/progress/:id"    element={<ProtectedRoute><AnalysisProgressPage /></ProtectedRoute>} />
        <Route path="/summary/:id"     element={<ProtectedRoute><CallSummaryPage /></ProtectedRoute>} />
        <Route path="/mood-timeline/:id" element={<ProtectedRoute><MoodTimelinePage /></ProtectedRoute>} />
        <Route path="/reliability/:id" element={<ProtectedRoute><ReliabilityInsightsPage /></ProtectedRoute>} />
        <Route path="/export/:id"      element={<ProtectedRoute><ExportReportPage /></ProtectedRoute>} />
        <Route path="/voice-auth/:id"  element={<ProtectedRoute><VoiceAuthenticityPage /></ProtectedRoute>} />

        {/* Protected main app — sidebar on desktop, BottomNav on mobile */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/"                      element={<HomePage />} />
          <Route path="/recording-details/:id" element={<RecordingPage />} />
          <Route path="/reports"               element={<ReportsPage />} />
          <Route path="/checkin"               element={<CheckInPage />} />
          <Route path="/people"                element={<PeoplePage />} />
          <Route path="/settings"              element={<SettingsPage />} />
          <Route path="/billing"               element={<BillingPage />} />
          <Route path="/admin"                 element={<AdminDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
