import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Component } from 'react'
import Layout         from './components/Layout'
import Dashboard      from './pages/Dashboard'
import Issues         from './pages/Issues'
import IssueDetail    from './pages/IssueDetail'
import IssueMap       from './pages/IssueMap'
import Alerts         from './pages/Alerts'
import HelpBoard      from './pages/HelpBoard'
import Emergency      from './pages/Emergency'
import Stories        from './pages/Stories'
import Volunteers     from './pages/Volunteers'
import BudgetVotes    from './pages/BudgetVotes'
import About          from './pages/About'
import Analytics      from './pages/Analytics'
import AdminPanel          from './pages/AdminPanel'
import AuthorityDashboard from './pages/AuthorityDashboard'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Profile        from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('Page error:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <h2 style={{ color: '#0f1f3d', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', marginBottom: 16 }}>This page encountered an error. Please try refreshing.</p>
          <button
            style={{ padding: '8px 18px', background: '#0f1f3d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}>
            Refresh Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function Spinner() {
  return (
    <div className="app-spinner">
      <div className="app-spinner__ring" />
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user)   return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (adminOnly && !['admin', 'authority'].includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public full-screen pages */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* App with sidebar */}
          <Route path="/" element={<Layout />}>
            <Route index               element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="issues"       element={<ErrorBoundary><Issues /></ErrorBoundary>} />
            <Route path="issues/:id"   element={<ErrorBoundary><IssueDetail /></ErrorBoundary>} />
            <Route path="map"          element={<ErrorBoundary><IssueMap /></ErrorBoundary>} />
            <Route path="alerts"       element={<ErrorBoundary><Alerts /></ErrorBoundary>} />
            <Route path="help"         element={<ErrorBoundary><HelpBoard /></ErrorBoundary>} />
            <Route path="stories"      element={<ErrorBoundary><Stories /></ErrorBoundary>} />
            <Route path="volunteers"   element={<ErrorBoundary><Volunteers /></ErrorBoundary>} />
            <Route path="budget"       element={<ErrorBoundary><BudgetVotes /></ErrorBoundary>} />
            <Route path="about"        element={<ErrorBoundary><About /></ErrorBoundary>} />

            {/* Login required */}
            <Route path="emergency" element={<ProtectedRoute><ErrorBoundary><Emergency /></ErrorBoundary></ProtectedRoute>} />
            <Route path="profile"   element={<ProtectedRoute><ErrorBoundary><Profile /></ErrorBoundary></ProtectedRoute>} />

            {/* Authority / Admin only */}
            <Route path="authority" element={<ProtectedRoute adminOnly><ErrorBoundary><AuthorityDashboard /></ErrorBoundary></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute adminOnly><ErrorBoundary><Analytics /></ErrorBoundary></ProtectedRoute>} />
            <Route path="admin"     element={<ProtectedRoute adminOnly><ErrorBoundary><AdminPanel /></ErrorBoundary></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
