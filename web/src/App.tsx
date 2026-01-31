import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import Dashboard from './components/Dashboard'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import ResetPasswordPage from './components/ResetPasswordPage'

function App() {
  // Simple routing logic based on URL
  const path = window.location.pathname;

  if (path === '/signup') {
    return <SignupPage />;
  }

  if (path.startsWith('/dashboard')) {
    return <Dashboard />;
  }

  if (path === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  if (path === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (path === '/login' || path === '/') {
    return <LoginPage />;
  }

  // Placeholder for other pages
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">FaceAttend ERP</h1>
      <p className="text-slate-600 mb-8 text-xl">Dashboard coming soon...</p>
      <a
        href="/login"
        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
      >
        Go to Login
      </a>
    </div>
  );
}

export default App
