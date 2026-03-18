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
import CTAnalysisView from './pages/CTAnalysisView'
import PatientIntake from './pages/PatientIntake'
import Settings from './pages/Settings'
import ScanUploadPage from './pages/workflow/ScanUploadPage'
import ProcessingPage from './pages/workflow/ProcessingPage'
import ScanResultsPage from './pages/workflow/ScanResultsPage'
import SingleModelAnalysisPage from './pages/analysis/SingleModelAnalysisPage'
import { ScanLine, Brain, ImageIcon } from 'lucide-react'
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

          {/* All authenticated routes wrapped in Layout (Sidebar + Topbar + MainContent) */}
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
            <Route path="patient-intake" element={<PatientIntake />} />
            <Route path="upload" element={<UploadScanStandalone />} />
            <Route path="predictions" element={<PredictionsList />} />
            <Route path="predictions/:id" element={<PredictionResult />} />
            <Route path="reports" element={<PredictionsList />} />
            <Route path="reports-list" element={<Navigate to="/reports" replace />} />
            <Route path="ct-analysis" element={<SingleModelAnalysisPage modelType="ct" title="CT Scan" subtitle="Lung & region analysis" Icon={ScanLine} conditionsLabel="Regions & features" />} />
            <Route path="brain-analysis" element={<SingleModelAnalysisPage modelType="brain" title="Brain Analysis" subtitle="Tumor & brain regions" Icon={Brain} conditionsLabel="Brain regions" />} />
            <Route path="xray-analysis" element={<SingleModelAnalysisPage modelType="xray" title="X-ray Analysis" subtitle="Disease list & risk" Icon={ImageIcon} conditionsLabel="Disease list" />} />
            <Route path="ai-predict" element={<Navigate to="/ct-analysis" replace />} />
            <Route path="ai-workflow" element={<Navigate to="/upload-scan" replace />} />
            <Route path="settings" element={<Settings />} />
            {/* CT workflow: same Layout so sidebar/topbar always visible */}
            <Route path="upload-scan" element={<ScanUploadPage />} />
            <Route path="processing" element={<ProcessingPage />} />
            <Route path="results" element={<ScanResultsPage />} />
            <Route path="analysis/:scan_id" element={<CTAnalysisView />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
