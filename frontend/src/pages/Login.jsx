import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert, Eye, EyeOff, LogIn } from 'lucide-react'
import './AuthPages.css'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const returnTo  = location.state?.from || '/'

  const [form, setForm]       = useState({ identifier: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      await login(form.identifier, form.password)
      navigate(returnTo, { replace: true })
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Login failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-brand">
          <ShieldAlert size={30} color="#f59e0b" />
          <h1>CivicSense</h1>
        </div>
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to report issues, get alerts, and support your community.</p>

        {err && <div className="auth-error">{err}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input className="form-input" type="text" autoFocus required
              placeholder="your_username or email@example.com"
              value={form.identifier} onChange={e => setForm(f => ({...f,identifier:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{display:'flex',justifyContent:'space-between'}}>
              Password
              <Link to="/forgot-password" className="auth-link" style={{fontSize:'.76rem',fontWeight:500}}>Forgot password?</Link>
            </label>
            <div className="password-wrap">
              <input className="form-input" required
                type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({...f,password:e.target.value}))} />
              <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            <LogIn size={15}/>{loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" className="auth-link">Create one free</Link>
        </div>
        <div className="auth-divider">or</div>
        <Link to="/" className="btn btn-ghost auth-guest">Browse anonymously</Link>
      </div>
      <div className="auth-bg">
        <div className="auth-bg__blob auth-bg__blob--1"/>
        <div className="auth-bg__blob auth-bg__blob--2"/>
      </div>
    </div>
  )
}
