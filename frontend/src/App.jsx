import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetails from './pages/PatientDetails'
import AddPatient from './pages/AddPatient'
import UploadScan from './pages/UploadScan'
import PredictionResult from './pages/PredictionResult'
import PredictionsList from './pages/PredictionsList'
import UploadScanStandalone from './pages/UploadScanStandalone'
import Settings from './pages/Settings'
import ErrorBoundary from './components/ErrorBoundary'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/add" element={<AddPatient />} />
            <Route path="patients/:id" element={<PatientDetails />} />
            <Route path="patients/:id/upload" element={<UploadScan />} />
            <Route path="upload" element={<UploadScanStandalone />} />
            <Route path="predictions" element={<PredictionsList />} />
            <Route path="predictions/:id" element={<PredictionResult />} />
            <Route path="reports" element={<PredictionsList />} />
            <Route path="reports-list" element={<Navigate to="/reports" replace />} />
            <Route path="ai-predict" element={<Navigate to="/upload" replace />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
