import { Routes, Route, Navigate, Link } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import Dashboard from './components/Dashboard'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      
      {/* 404/Fallback Page */}
      <Route path="*" element={
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">404 - Page Not Found</h1>
          <p className="text-slate-600 mb-8 text-xl">The page you are looking for doesn't exist.</p>
          <Link
            to="/login"
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            Go to Login
          </Link>
        </div>
      } />
    </Routes>
  );
}

export default App
